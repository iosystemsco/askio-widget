import { Badge } from './Badge';

export interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  isConnecting = false,
  onReconnect,
  className = '' 
}: ConnectionStatusProps) {
  if (isConnected) {
    return (
      <Badge variant="success" size="sm" className={className}>
        <span className="w-2 h-2 bg-[var(--chat-success)] rounded-full mr-1.5 animate-pulse" />
        Connected
      </Badge>
    );
  }
  
  if (isConnecting) {
    return (
      <Badge variant="warning" size="sm" className={className}>
        <svg
          className="animate-spin h-3 w-3 mr-1.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Connecting...
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="error" 
      size="sm" 
      className={`${className} ${onReconnect ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onReconnect}
      role={onReconnect ? 'button' : undefined}
      tabIndex={onReconnect ? 0 : undefined}
      onKeyDown={onReconnect ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onReconnect();
        }
      } : undefined}
    >
      <span className="w-2 h-2 bg-[var(--chat-error)] rounded-full mr-1.5" />
      Disconnected
      {onReconnect && <span className="ml-1">• Click to reconnect</span>}
    </Badge>
  );
}
