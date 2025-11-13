/**
 * Error types and error handling utilities
 * @module types/errors
 */

/**
 * Base error class for chat widget errors
 * 
 * @example
 * ```typescript
 * throw new ChatError(
 *   'Connection failed',
 *   'CONNECTION_FAILED',
 *   true // recoverable
 * );
 * ```
 */
export class ChatError extends Error {
  /**
   * Create a new ChatError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param recoverable - Whether the error can be recovered from
   */
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Error codes used throughout the chat widget
 */
export const ErrorCodes = {
  /** Authentication failed */
  AUTH_FAILED: 'AUTH_FAILED',
  /** WebSocket connection failed */
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  /** Microphone permission denied */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** Audio processing failed */
  AUDIO_PROCESSING_FAILED: 'AUDIO_PROCESSING_FAILED',
  /** Invalid configuration */
  INVALID_CONFIG: 'INVALID_CONFIG',
  /** Network error */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Session expired */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  /** Unknown error */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * User-facing error messages
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  AUTH_FAILED: 'Unable to authenticate. Please check your configuration.',
  CONNECTION_FAILED: 'Connection lost. Click to reconnect.',
  PERMISSION_DENIED: 'Microphone access denied. Please allow microphone access.',
  AUDIO_PROCESSING_FAILED: 'Voice input unavailable. Please use text input.',
  INVALID_CONFIG: 'Invalid configuration. Please contact support.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Session expired. Please reconnect.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};
