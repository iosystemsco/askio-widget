import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target';
    
    const variantStyles = {
      primary: 'bg-[var(--chat-primary)] text-white hover:opacity-90 focus:ring-[var(--chat-primary)]',
      secondary: 'bg-[var(--chat-secondary)] text-white hover:opacity-90 focus:ring-[var(--chat-secondary)]',
      ghost: 'bg-transparent text-[var(--chat-text)] hover:bg-[var(--chat-surface)] focus:ring-[var(--chat-border)]',
      danger: 'bg-[var(--chat-error)] text-white hover:opacity-90 focus:ring-[var(--chat-error)]',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-[calc(var(--chat-radius,1rem)*0.5)]',
      md: 'px-4 py-2 text-base rounded-[calc(var(--chat-radius,1rem)*0.625)]',
      lg: 'px-6 py-3 text-lg rounded-[calc(var(--chat-radius,1rem)*0.75)]',
    };
    
    const widthStyles = fullWidth ? 'w-full' : '';
    
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`.trim();
    
    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
