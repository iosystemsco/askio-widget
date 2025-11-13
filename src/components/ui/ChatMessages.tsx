import { useEffect, useRef, useMemo, memo } from 'react';
import type { ChatMessage } from '../../types/messages';
import { MessageBubble } from './MessageBubble';

export interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  showAvatars?: boolean;
  botName?: string;
  userName?: string;
  className?: string;
  autoScroll?: boolean;
}

export const ChatMessages = memo(function ChatMessages({
  messages,
  isTyping = false,
  showAvatars = true,
  botName = 'AI Assistant',
  userName = 'You',
  className = '',
  autoScroll = true,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize rendered messages to avoid re-rendering unchanged messages
  const renderedMessages = useMemo(() => {
    return messages.map((message) => (
      <MessageBubble
        key={message.id}
        message={message}
        showAvatar={showAvatars}
        botName={botName}
        userName={userName}
      />
    ));
  }, [messages, showAvatars, botName, userName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, autoScroll]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto px-4 py-4 chat-scrollbar md:chat-scrollbar chat-scrollbar-mobile touch-scroll ${className}`}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--chat-text-secondary)] text-center">
            No messages yet. Start a conversation!
          </p>
        </div>
      ) : (
        <>
          {renderedMessages}

          {isTyping && (
            <div className="flex gap-2 mb-4">
              {showAvatars && (
                <div className="w-8 h-8 rounded-full bg-[var(--chat-primary)] flex items-center justify-center text-white text-xs font-medium">
                  {botName.charAt(0)}
                </div>
              )}
              <div className="flex items-center gap-1 px-4 py-2 bg-[var(--chat-bot-message)] rounded-[var(--chat-radius,1rem)]">
                <span className="w-2 h-2 bg-[var(--chat-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[var(--chat-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[var(--chat-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
});
