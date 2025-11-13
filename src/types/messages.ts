/**
 * Message types for chat widget
 * 
 * This module defines all message types used for WebSocket communication
 * and UI display in the chat widget.
 * 
 * @module types/messages
 */

/**
 * Base message interface
 * All message types extend this interface
 */
interface BaseMessage {
  /** Message type identifier */
  type: string;
  /** Unix timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Union type of all client-to-server messages
 */
export type ClientMessage = TextMessage | AudioChunkMessage | EndSpeechMessage;

/**
 * Text message sent from client to server
 */
export interface TextMessage extends BaseMessage {
  /** Message type identifier */
  type: 'text-message';
  /** Message text content */
  text: string;
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Audio chunk message for voice input
 * Binary audio data is sent separately
 */
export interface AudioChunkMessage extends BaseMessage {
  /** Message type identifier */
  type: 'audio-chunk';
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * End of speech message
 * Signals that voice input has ended
 */
export interface EndSpeechMessage extends BaseMessage {
  /** Message type identifier */
  type: 'end-speech';
  /** Final transcribed text */
  finalText?: string;
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Union type of all server-to-client messages
 */
export type ServerMessage =
  | SttChunkMessage
  | LlmChunkMessage
  | TtsChunkMessage
  | ErrorMessage
  | ConnectionAckMessage
  | EndMessage
  | RenewedMessage
  | TextResponseMessage;

/**
 * Speech-to-text chunk message
 * Contains partial or final transcription from voice input
 */
export interface SttChunkMessage extends BaseMessage {
  /** Message type identifier */
  type: 'stt-chunk';
  /** Transcribed text */
  text: string;
  /** Whether this is the final transcription */
  isFinal: boolean;
  /** Optional session identifier */
  sessionId?: string;
  /** Word-level timing information */
  words?: Array<{
    /** The transcribed word */
    word: string;
    /** Start time in seconds */
    start: number;
    /** End time in seconds */
    end: number;
  }>;
}

/**
 * LLM response chunk message
 * Contains streaming text from the AI model
 */
export interface LlmChunkMessage extends BaseMessage {
  /** Message type identifier */
  type: 'llm-chunk';
  /** Chunk of response text */
  text: string;
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Text-to-speech chunk message
 * Indicates audio data is being sent
 */
export interface TtsChunkMessage extends BaseMessage {
  /** Message type identifier */
  type: 'tts-chunk';
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Error message from server
 */
export interface ErrorMessage extends BaseMessage {
  /** Message type identifier */
  type: 'error';
  /** Error message text */
  error: string;
  /** Optional error code */
  code?: string;
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Connection acknowledgment message
 * Sent when WebSocket connection is established
 */
export interface ConnectionAckMessage extends BaseMessage {
  /** Message type identifier */
  type: 'connection-ack';
  /** Session identifier */
  sessionId: string;
  /** Connection mode */
  mode: 'text' | 'voice';
  /** Language code */
  language: string;
}

/**
 * End of response message
 * Signals that the current response is complete
 */
export interface EndMessage extends BaseMessage {
  /** Message type identifier */
  type: 'end';
  /** Optional session identifier */
  sessionId?: string;
  /** Complete response text */
  fullResponse?: string;
}

/**
 * Token renewal message
 * Contains new JWT token
 */
export interface RenewedMessage extends BaseMessage {
  /** Message type identifier */
  type: 'renewed';
  /** New JWT token */
  token: string;
  /** Token expiration timestamp */
  expiresAt: number;
  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Text response message
 * Contains a complete text message with metadata
 */
export interface TextResponseMessage extends BaseMessage {
  /** Message type identifier */
  type: 'text';
  /** Message identifier */
  id: string;
  /** Session identifier */
  session_id: string;
  /** Message payload */
  payload: {
    /** Message content */
    content: string;
    /** Message role */
    role: 'user' | 'assistant';
    /** Optional context metadata */
    context?: {
      /** Source of the message (e.g., 'stt' for voice) */
      source?: 'stt';
      /** Whether this is a final transcription */
      is_final?: boolean;
      /** Confidence score (0-1) */
      confidence?: number;
      /** Additional context properties */
      [key: string]: any;
    };
  };
}

/**
 * Chat message for UI display
 * 
 * This is the message format used internally by the widget
 * for displaying messages in the chat interface.
 * 
 * @example
 * ```typescript
 * const message: ChatMessage = {
 *   id: 'msg-123',
 *   content: 'Hello, how can I help you?',
 *   type: 'bot',
 *   timestamp: Date.now(),
 *   metadata: {
 *     source: 'text'
 *   }
 * };
 * ```
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Formatted message content (may contain HTML for bot messages) */
  content: string;
  /** Raw unformatted content (markdown for bot messages) */
  rawContent?: string;
  /** Message sender type */
  type: 'user' | 'bot' | 'system';
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Optional message metadata */
  metadata?: {
    /** Source of the message */
    source?: 'text' | 'voice';
    /** Confidence score for voice transcription */
    confidence?: number;
    /** Whether this is a final transcription */
    isFinal?: boolean;
  };
}
