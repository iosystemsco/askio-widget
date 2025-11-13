/**
 * ChatWidget component
 * Main styled widget component with full UI
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { ChatProvider } from './ChatProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { ChatHeader } from './ui/ChatHeader';
import { ChatMessages } from './ui/ChatMessages';
import { ChatInput } from './ui/ChatInput';
import { useChat } from '../hooks/useChat';
import type { ThemeConfig, WidgetPosition, WidgetDimensions } from '../types/config';

// Lazy load voice button
const VoiceButton = lazy(() => import('./ui/VoiceButton').then(m => ({ default: m.VoiceButton })));

export interface ChatWidgetProps {
  siteToken: string;
  theme?: ThemeConfig;
  language?: string;
  position?: WidgetPosition;
  dimensions?: WidgetDimensions;
  hideButton?: boolean;
  initialOpen?: boolean;
  enableVoice?: boolean;
  enableTTS?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  welcomeMessage?: string;
  suggestions?: string[];
  showAvatars?: boolean;
  botName?: string;
  userName?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Internal widget UI component
 */
function ChatWidgetUI({
  title,
  subtitle,
  placeholder,
  welcomeMessage,
  suggestions,
  showAvatars,
  botName,
  userName,
  enableVoice,
  onClose,
}: Omit<ChatWidgetProps, 'siteToken' | 'theme' | 'language' | 'position' | 'initialOpen' | 'enableTTS' | 'className' | 'onReady' | 'onError' | 'onConnectionChange' | 'onOpen'>) {
  const [state, actions] = useChat();
  const [showWelcome, setShowWelcome] = useState(true);

  // Hide welcome message after first user message
  useEffect(() => {
    if (state.messages.some(m => m.type === 'user')) {
      setShowWelcome(false);
    }
  }, [state.messages]);

  // Add welcome message if provided
  useEffect(() => {
    if (welcomeMessage && state.messages.length === 0 && showWelcome) {
      // Welcome message is just displayed, not added to messages
    }
  }, [welcomeMessage, state.messages.length, showWelcome]);

  const handleSendMessage = async (content: string) => {
    await actions.sendMessage(content);
  };

  const handleReconnect = async () => {
    await actions.reconnect();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--chat-background)] rounded-[var(--chat-radius,1rem)] shadow-2xl overflow-hidden">
      <ChatHeader
        title={title}
        subtitle={subtitle}
        isConnected={state.isConnected}
        isConnecting={state.isLoading && !state.isConnected}
        onClose={onClose}
        onReconnect={handleReconnect}
        showConnectionStatus={true}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Welcome message and suggestions */}
        {showWelcome && welcomeMessage && state.messages.length === 0 && (
          <div className="px-4 py-4 border-b border-[var(--chat-border)]">
            <p className="text-[var(--chat-text)] mb-3">{welcomeMessage}</p>
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--chat-text-secondary)]">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-sm px-3 py-1.5 bg-[var(--chat-surface)] hover:bg-[var(--chat-primary)] hover:text-white text-[var(--chat-text)] rounded-full border border-[var(--chat-border)] transition-colors duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ChatMessages
          messages={state.messages}
          isTyping={state.isTyping}
          showAvatars={showAvatars}
          botName={botName}
          userName={userName}
          autoScroll={true}
        />

        {/* Error message */}
        {state.error && (
          <div className="px-4 py-2 bg-[var(--chat-error)] bg-opacity-10 border-t border-[var(--chat-error)]">
            <p className="text-sm text-[var(--chat-error)]">{state.error}</p>
          </div>
        )}

        <div className="relative">
          <ChatInput
            onSend={handleSendMessage}
            placeholder={placeholder}
            disabled={!state.isConnected || state.isLoading || state.isRecording}
            showSendButton={true}
          />

          {/* Voice button overlay */}
          {enableVoice && (
            <div className="absolute right-16 bottom-4">
              <Suspense fallback={null}>
                <VoiceButton
                  isRecording={state.isRecording}
                  disabled={!state.isConnected}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main ChatWidget component with provider and theme
 */
export function ChatWidget({
  siteToken,
  theme = { preset: 'default' },
  language = 'en',
  position = 'bottom-right',
  dimensions,
  hideButton = false,
  initialOpen = false,
  enableVoice = false,
  enableTTS = true,
  className = '',
  title = 'AI Assistant',
  subtitle,
  placeholder = 'Type a message...',
  welcomeMessage,
  suggestions,
  showAvatars = true,
  botName = 'AI',
  userName = 'You',
  onReady,
  onError,
  onConnectionChange,
  onOpen,
  onClose,
}: ChatWidgetProps) {
  const isInlineMode = position === 'inline';
  const [isOpen, setIsOpen] = useState(initialOpen || isInlineMode);
  const [isMinimized, setIsMinimized] = useState(!initialOpen && !isInlineMode);

  // Position styles for floating widget
  const positionStyles: Record<WidgetPosition, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'left-center': 'left-4 top-1/2 -translate-y-1/2',
    'right-center': 'right-4 top-1/2 -translate-y-1/2',
    'inline': '',
  };

  // Default dimensions
  const defaultDimensions = {
    width: dimensions?.width || '384px',
    height: dimensions?.height || '600px',
    maxWidth: dimensions?.maxWidth || 'calc(100vw - 2rem)',
    maxHeight: dimensions?.maxHeight || 'calc(100vh - 2rem)',
    minWidth: dimensions?.minWidth,
    minHeight: dimensions?.minHeight,
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    onOpen?.();
  };

  const handleClose = () => {
    if (isInlineMode) return; // Can't close inline mode
    setIsMinimized(true);
    setTimeout(() => {
      setIsOpen(false);
      onClose?.();
    }, 200); // Wait for animation
  };

  const handleToggle = () => {
    if (isOpen && !isMinimized) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Inline mode renders differently
  if (isInlineMode) {
    return (
      <ChatProvider
        siteToken={siteToken}
        config={{
          language,
          ttsEnabled: enableTTS,
        }}
        onReady={onReady}
        onError={onError}
        onConnectionChange={onConnectionChange}
      >
        <ThemeProvider theme={theme}>
          <div 
            className={`w-full h-full ${className}`}
            style={{
              width: defaultDimensions.width,
              height: defaultDimensions.height,
              maxWidth: defaultDimensions.maxWidth,
              maxHeight: defaultDimensions.maxHeight,
              minWidth: defaultDimensions.minWidth,
              minHeight: defaultDimensions.minHeight,
            }}
          >
            <ChatWidgetUI
              title={title}
              subtitle={subtitle}
              placeholder={placeholder}
              welcomeMessage={welcomeMessage}
              suggestions={suggestions}
              showAvatars={showAvatars}
              botName={botName}
              userName={userName}
              enableVoice={enableVoice}
              onClose={undefined} // No close button in inline mode
            />
          </div>
        </ThemeProvider>
      </ChatProvider>
    );
  }

  // Floating widget mode
  return (
    <ChatProvider
      siteToken={siteToken}
      config={{
        language,
        ttsEnabled: enableTTS,
      }}
      onReady={onReady}
      onError={onError}
      onConnectionChange={onConnectionChange}
    >
      <ThemeProvider theme={theme}>
        <div className={`fixed ${positionStyles[position]} z-50 ${className}`}>
          {/* Widget container */}
          <div
            className={`
              transition-all duration-300 ease-in-out
              ${isOpen && !isMinimized ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
            `}
            style={{
              width: defaultDimensions.width,
              height: defaultDimensions.height,
              maxWidth: defaultDimensions.maxWidth,
              maxHeight: defaultDimensions.maxHeight,
              minWidth: defaultDimensions.minWidth,
              minHeight: defaultDimensions.minHeight,
            }}
          >
            <ChatWidgetUI
              title={title}
              subtitle={subtitle}
              placeholder={placeholder}
              welcomeMessage={welcomeMessage}
              suggestions={suggestions}
              showAvatars={showAvatars}
              botName={botName}
              userName={userName}
              enableVoice={enableVoice}
              onClose={handleClose}
            />
          </div>

          {/* Floating action button */}
          {!hideButton && (
            <button
              onClick={handleToggle}
              className={`
                transition-all duration-300 ease-in-out
                ${isOpen && !isMinimized ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}
                w-14 h-14 rounded-full bg-[var(--chat-primary)] hover:bg-[var(--chat-secondary)] text-white shadow-lg flex items-center justify-center
              `}
              aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
              {isOpen && !isMinimized ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile fullscreen overlay */}
        <style>{`
          @media (max-width: 640px) {
            .fixed.z-50 > div:first-child {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              transform: none !important;
              border-radius: 0 !important;
            }
          }
        `}</style>
      </ThemeProvider>
    </ChatProvider>
  );
}
