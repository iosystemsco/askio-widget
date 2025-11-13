/**
 * API and service types for chat widget
 * @module types/api
 */

/**
 * Authentication response from the server
 */
export interface AuthResponse {
  /** JWT token for WebSocket authentication */
  jwt: string;
  /** ISO 8601 timestamp when the token expires */
  expires_at: string;
  /** Optional session identifier */
  session_id?: string;
}

/**
 * Decoded JWT payload structure
 */
export interface JWTPayload {
  /** Site token that identifies the customer */
  siteToken: string;
  /** Expiration timestamp (Unix epoch) */
  exp: number;
  /** Issued at timestamp (Unix epoch) */
  iat: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Site token for authentication */
  siteToken: string;
  /** Optional API URL override */
  apiUrl?: string;
}

/**
 * Error codes for authentication failures
 */
export const AuthErrorCodes = {
  /** Site token is invalid or missing */
  INVALID_SITE_TOKEN: 'INVALID_SITE_TOKEN',
  /** Authentication request failed */
  AUTH_FAILED: 'AUTH_FAILED',
  /** JWT token has expired */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  /** Network error during authentication */
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

/**
 * Type for authentication error codes
 */
export type AuthErrorCode = typeof AuthErrorCodes[keyof typeof AuthErrorCodes];

/**
 * WebSocket connection options
 */
export interface WebSocketConnectionOptions {
  /** WebSocket URL */
  url?: string;
  /** JWT token for authentication */
  jwt: string;
  /** Language code (e.g., 'en', 'es') */
  language?: string;
  /** Enable text-to-speech */
  ttsEnabled?: boolean;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

/**
 * WebSocket reconnection strategy configuration
 */
export interface ReconnectionStrategy {
  /** Maximum number of reconnection attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
}

/**
 * Error recovery options
 */
export interface ErrorRecovery {
  /** Function to retry the failed operation */
  retry: () => Promise<void>;
  /** Optional fallback function */
  fallback?: () => void;
  /** User-facing action message */
  userAction?: string;
}
