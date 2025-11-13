/**
 * WebSocket message types for the chat API
 * Supports bidirectional streaming for text and voice modes
 */

// Client -> Server messages
export type ClientMessage = TextMessage | AudioChunkMessage | EndSpeechMessage;

// Server -> Client messages
export type ServerMessage =
  | SttChunkMessage
  | LlmChunkMessage
  | TtsChunkMessage
  | ErrorMessage
  | ConnectionAckMessage
  | EndMessage
  | RenewedMessage
  | TextResponseMessage;

// Base message interface
interface BaseMessage {
  type: string;
  timestamp?: number;
}

// Client messages
export interface TextMessage extends BaseMessage {
  type: 'text-message';
  text: string;
  sessionId?: string;
}

export interface AudioChunkMessage extends BaseMessage {
  type: 'audio-chunk';
  // Audio data will be sent as binary in WebSocket
  // This interface is for type checking only
  sessionId?: string;
}

export interface EndSpeechMessage extends BaseMessage {
  type: 'end-speech';
  finalText?: string;
  sessionId?: string;
}

// Server messages
export interface SttChunkMessage extends BaseMessage {
  type: 'stt-chunk';
  text: string;
  isFinal: boolean;
  sessionId?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface LlmChunkMessage extends BaseMessage {
  type: 'llm-chunk';
  text: string;
  sessionId?: string;
}

export interface TtsChunkMessage extends BaseMessage {
  type: 'tts-chunk';
  // Audio data will be sent as binary in WebSocket
  // This interface is for type checking only
  sessionId?: string;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: string;
  code?: string;
  sessionId?: string;
}

export interface ConnectionAckMessage extends BaseMessage {
  type: 'connection-ack';
  sessionId: string;
  mode: 'text' | 'voice';
  language: string;
}

export interface EndMessage extends BaseMessage {
  type: 'end';
  sessionId?: string;
  fullResponse?: string;
}

export interface RenewedMessage extends BaseMessage {
  type: 'renewed';
  token: string;
  expiresAt: number;
  sessionId?: string;
}

export interface TextResponseMessage extends BaseMessage {
  type: 'text';
  id: string;
  session_id: string;
  payload: {
    content: string;
    role: 'user' | 'assistant';
    context?: {
      source?: 'stt';
      is_final?: boolean;
      confidence?: number;
      [key: string]: any;
    };
  };
}

// WebSocket connection state
export interface WebSocketState {
  sessionId: string;
  mode: 'text' | 'voice';
  language: string;
  isConnected: boolean;
  lastActivity: number;
  sttBuffer: SttChunkMessage[];
  isProcessing: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
}

// WebSocket session state for STT/TTS clients
export interface WebSocketSessionState extends WebSocketState {
  ws: any; // WebSocket instance (browser WebSocket or ws package WebSocket)
  sttClient?: any; // Cartesia STT WebSocket client
  ttsClient?: any; // Cartesia TTS WebSocket client
  idleTimer?: ReturnType<typeof setTimeout>;
  pingTimer?: ReturnType<typeof setTimeout>;
  hostname?: string;
  path?: string;
}

// WebSocket event handlers
export interface WebSocketHandlers {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: ServerMessage | ArrayBuffer) => void;
  onSttChunk?: (message: SttChunkMessage) => void;
  onLlmChunk?: (message: LlmChunkMessage) => void;
  onTtsChunk?: (audioData: ArrayBuffer) => void;
  onErrorMessage?: (message: ErrorMessage) => void;
  onConnectionAck?: (message: ConnectionAckMessage) => void;
  onEnd?: (message: EndMessage) => void;
}

// Rate limiting types
export interface RateLimitInfo {
  ipAddress: string;
  sessionId: string;
  endpoint: string;
  requestCount: number;
  windowStart: Date;
}

// STT/TTS processing types
export interface SttProcessor {
  processAudioChunk(audioData: ArrayBuffer): Promise<SttChunkMessage[]>;
  finalizeTranscription(): Promise<string>;
}

export interface TtsProcessor {
  generateSpeech(text: string): AsyncGenerator<ArrayBuffer, void, unknown>;
  stop(): void;
}

// Conversation context
export interface ConversationContext {
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  hostname?: string;
  path?: string;
  language: string;
}
