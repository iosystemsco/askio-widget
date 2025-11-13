import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface VoiceButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  isRecording?: boolean;
  isProcessing?: boolean;
  hasPermission?: boolean;
  onRequestPermission?: () => void;
}

export const VoiceButton = forwardRef<HTMLButtonElement, VoiceButtonProps>(
  (
    {
      isRecording = false,
      isProcessing = false,
      hasPermission = true,
      onRequestPermission,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target p-2 rounded-full';

    // Different states for the button
    const stateStyles = isRecording
      ? 'bg-[var(--chat-error)] text-white hover:opacity-90 focus:ring-[var(--chat-error)] animate-pulse'
      : isProcessing
        ? 'bg-[var(--chat-secondary)] text-white opacity-75 cursor-wait'
        : !hasPermission
          ? 'bg-[var(--chat-surface)] text-[var(--chat-text-secondary)] hover:bg-[var(--chat-border)] focus:ring-[var(--chat-border)]'
          : 'bg-[var(--chat-primary)] text-white hover:opacity-90 focus:ring-[var(--chat-primary)]';

    const combinedClassName = `${baseStyles} ${stateStyles} ${className}`.trim();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!hasPermission && onRequestPermission) {
        onRequestPermission();
      }
      props.onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isProcessing}
        aria-label={
          isRecording
            ? 'Stop recording'
            : isProcessing
              ? 'Processing audio'
              : !hasPermission
                ? 'Request microphone permission'
                : 'Start voice input'
        }
        {...props}
        onClick={handleClick}
      >
        {isRecording ? (
          // Recording state - stop icon
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" fill="currentColor" />
          </svg>
        ) : isProcessing ? (
          // Processing state - spinner
          <svg
            className="animate-spin w-5 h-5"
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
        ) : !hasPermission ? (
          // No permission - microphone with slash
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
            <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />
          </svg>
        ) : (
          // Ready state - microphone icon
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>
    );
  }
);

VoiceButton.displayName = 'VoiceButton';
