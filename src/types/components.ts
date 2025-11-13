/**
 * Component prop types
 * @module types/components
 */

import type { ThemeConfig, WidgetPosition, ChatConfig } from './config';
import type { ChatState, ChatActions } from './hooks';

/**
 * Props for the main ChatWidget component
 */
export interface ChatWidgetProps {
  /**
   * Site token for authentication (required)
   * Obtain this from your dashboard
   */
  siteToken: string;

  /**
   * Theme configuration
   * Can be a preset name or custom theme object
   * @default { preset: 'default' }
   */
  theme?: ThemeConfig;

  /**
   * Language code for the chat interface
   * @default 'en'
   * @example 'en', 'es', 'fr', 'de', 'pt'
   */
  language?: string;

  /**
   * Widget position on the page
   * @default 'bottom-right'
   */
  position?: WidgetPosition;

  /**
   * Widget dimensions (width, height, etc.)
   */
  dimensions?: import('./config').WidgetDimensions;

  /**
   * Hide the floating action button
   * Useful for inline mode or custom triggers
   * @default false
   */
  hideButton?: boolean;

  /**
   * Whether the widget should be open initially
   * @default false
   */
  initialOpen?: boolean;

  /**
   * Enable voice input functionality
   * @default false
   */
  enableVoice?: boolean;

  /**
   * Enable text-to-speech for bot responses
   * @default true
   */
  enableTTS?: boolean;

  /**
   * Additional CSS class name for the widget container
   */
  className?: string;

  /**
   * Chat header title
   * @default 'AI Assistant'
   */
  title?: string;

  /**
   * Chat header subtitle
   */
  subtitle?: string;

  /**
   * Input placeholder text
   * @default 'Type a message...'
   */
  placeholder?: string;

  /**
   * Welcome message shown when chat is empty
   */
  welcomeMessage?: string;

  /**
   * Suggested questions to display
   */
  suggestions?: string[];

  /**
   * Show user and bot avatars
   * @default true
   */
  showAvatars?: boolean;

  /**
   * Bot display name
   * @default 'AI'
   */
  botName?: string;

  /**
   * User display name
   * @default 'You'
   */
  userName?: string;

  /**
   * Callback when widget is ready
   */
  onReady?: () => void;

  /**
   * Callback when an error occurs
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;

  /**
   * Callback when connection status changes
   * @param isConnected - Whether the widget is connected
   */
  onConnectionChange?: (isConnected: boolean) => void;

  /**
   * Callback when widget is opened
   */
  onOpen?: () => void;

  /**
   * Callback when widget is closed
   */
  onClose?: () => void;
}

/**
 * Props for the ChatProvider component
 */
export interface ChatProviderProps {
  /**
   * Site token for authentication (required)
   */
  siteToken: string;

  /**
   * Chat configuration options
   */
  config?: ChatConfig;

  /**
   * Child components
   */
  children: React.ReactNode;

  /**
   * Callback when provider is ready
   */
  onReady?: () => void;

  /**
   * Callback when an error occurs
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;

  /**
   * Callback when connection status changes
   * @param isConnected - Whether connected to the service
   */
  onConnectionChange?: (isConnected: boolean) => void;
}

/**
 * Props for the ChatWidgetHeadless component
 */
export interface ChatWidgetHeadlessProps {
  /**
   * Site token for authentication (required)
   */
  siteToken: string;

  /**
   * Language code for the chat
   * @default 'en'
   */
  language?: string;

  /**
   * Enable text-to-speech
   * @default true
   */
  ttsEnabled?: boolean;

  /**
   * WebSocket URL override
   */
  wsUrl?: string;

  /**
   * API URL override
   */
  apiUrl?: string;

  /**
   * Callback when ready
   */
  onReady?: () => void;

  /**
   * Callback when an error occurs
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;

  /**
   * Callback when connection status changes
   * @param isConnected - Whether connected
   */
  onConnectionChange?: (isConnected: boolean) => void;

  /**
   * Render function that receives chat state and actions
   * @param state - Current chat state
   * @param actions - Available chat actions
   * @returns React elements to render
   */
  children: (state: ChatState, actions: ChatActions) => React.ReactNode;
}

/**
 * Props for the ThemeProvider component
 */
export interface ThemeProviderProps {
  /**
   * Theme configuration
   * @default { preset: 'default' }
   */
  theme?: ThemeConfig;

  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * Props for UI components
 */
export interface ChatHeaderProps {
  /** Header title */
  title?: string;
  /** Header subtitle */
  subtitle?: string;
  /** Whether connected to service */
  isConnected: boolean;
  /** Whether currently connecting */
  isConnecting?: boolean;
  /** Callback when close button clicked */
  onClose?: () => void;
  /** Callback when reconnect button clicked */
  onReconnect?: () => void;
  /** Whether to show connection status */
  showConnectionStatus?: boolean;
}

/**
 * Props for ChatMessages component
 */
export interface ChatMessagesProps {
  /** Array of messages to display */
  messages: import('./messages').ChatMessage[];
  /** Whether bot is typing */
  isTyping?: boolean;
  /** Whether to show avatars */
  showAvatars?: boolean;
  /** Bot display name */
  botName?: string;
  /** User display name */
  userName?: string;
  /** Whether to auto-scroll to latest message */
  autoScroll?: boolean;
}

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  /**
   * Callback when message is sent
   * @param message - The message content
   */
  onSend: (message: string) => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether to show send button */
  showSendButton?: boolean;
}

/**
 * Props for MessageBubble component
 */
export interface MessageBubbleProps {
  /** Message to display */
  message: import('./messages').ChatMessage;
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Display name for the message sender */
  senderName?: string;
}

/**
 * Props for VoiceButton component
 */
export interface VoiceButtonProps {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback when recording stops */
  onStop?: () => void;
}

/**
 * Props for ConnectionStatus component
 */
export interface ConnectionStatusProps {
  /** Whether connected */
  isConnected: boolean;
  /** Whether currently connecting */
  isConnecting?: boolean;
  /** Callback when reconnect clicked */
  onReconnect?: () => void;
}
