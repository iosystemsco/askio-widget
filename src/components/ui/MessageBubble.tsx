import { useMemo, memo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { ChatMessage } from '../../types/messages';
import { Avatar } from './Avatar';

export interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  botName?: string;
  userName?: string;
}

export const MessageBubble = memo(function MessageBubble({ 
  message, 
  showAvatar = true,
  botName = 'AI Assistant',
  userName = 'You'
}: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  
  // Parse markdown for bot messages
  const formattedContent = useMemo(() => {
    if (message.type === 'bot') {
      try {
        const html = marked.parse(message.content, { async: false }) as string;
        return DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
          ALLOWED_ATTR: ['href', 'target', 'rel'],
        });
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return message.content;
      }
    }
    return message.content;
  }, [message.content, message.type]);
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[var(--chat-text-secondary)] bg-[var(--chat-surface)] px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`flex gap-2 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && (
        <Avatar 
          size="sm" 
          fallback={isUser ? userName : botName}
        />
      )}
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[75%] message-bubble-mobile`}>
        <div
          className={`px-4 py-2 rounded-[var(--chat-radius,1rem)] ${
            isUser
              ? 'bg-[var(--chat-user-message)] text-[var(--chat-text)]'
              : 'bg-[var(--chat-bot-message)] text-[var(--chat-text)]'
          }`}
        >
          {message.type === 'bot' ? (
            <div 
              className="message"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        
        {message.metadata?.source === 'voice' && (
          <span className="text-xs text-[var(--chat-text-secondary)] mt-1 px-2">
            🎤 Voice message
          </span>
        )}
      </div>
    </div>
  );
});
