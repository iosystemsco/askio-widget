import { useState, useRef, KeyboardEvent, FormEvent } from 'react';
import { Button } from './Button';

export interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showSendButton?: boolean;
  className?: string;
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 2000,
  showSendButton = true,
  className = '',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Enforce max length
    if (value.length <= maxLength) {
      setMessage(value);
      
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-end gap-2 px-4 py-3 bg-[var(--chat-surface)] border-t border-[var(--chat-border)] chat-input-mobile-keyboard ${className}`}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-[var(--chat-background)] text-[var(--chat-text)] placeholder:text-[var(--chat-text-secondary)] px-4 py-2 rounded-[var(--chat-radius,1rem)] border border-[var(--chat-border)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-primary)] focus:border-transparent transition-all duration-200 max-h-[120px] overflow-y-auto chat-scrollbar touch-target"
        style={{ minHeight: '44px' }}
      />

      {showSendButton && (
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!canSend}
          className="!p-2 rounded-full shrink-0"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </Button>
      )}

      {message.length > maxLength * 0.9 && (
        <span className="absolute bottom-full right-4 mb-1 text-xs text-[var(--chat-text-secondary)]">
          {message.length}/{maxLength}
        </span>
      )}
    </form>
  );
}
