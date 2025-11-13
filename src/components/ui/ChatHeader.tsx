import { ConnectionStatus } from './ConnectionStatus';
import { Button } from './Button';

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  isConnected: boolean;
  isConnecting?: boolean;
  onClose?: () => void;
  onReconnect?: () => void;
  showConnectionStatus?: boolean;
  className?: string;
}

export function ChatHeader({
  title = 'AI Assistant',
  subtitle,
  isConnected,
  isConnecting = false,
  onClose,
  onReconnect,
  showConnectionStatus = true,
  className = '',
}: ChatHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-[var(--chat-surface)] border-b border-[var(--chat-border)] ${className}`}
    >
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-[var(--chat-text)] truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[var(--chat-text-secondary)] truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-2">
        {showConnectionStatus && (
          <ConnectionStatus
            isConnected={isConnected}
            isConnecting={isConnecting}
            onReconnect={onReconnect}
          />
        )}

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="!p-2 rounded-full hover:bg-[var(--chat-background)]"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
