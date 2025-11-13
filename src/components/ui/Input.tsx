import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, fullWidth = false, className = '', ...props }, ref) => {
    const baseStyles = 'px-4 py-2 bg-[var(--chat-surface)] text-[var(--chat-text)] border border-[var(--chat-border)] rounded-[var(--chat-radius,1rem)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-primary)] focus:border-transparent transition-all duration-200 placeholder:text-[var(--chat-text-secondary)]';
    
    const errorStyles = error ? 'border-[var(--chat-error)] focus:ring-[var(--chat-error)]' : '';
    
    const widthStyles = fullWidth ? 'w-full' : '';
    
    const combinedClassName = `${baseStyles} ${errorStyles} ${widthStyles} ${className}`.trim();
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <input
          ref={ref}
          className={combinedClassName}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[var(--chat-error)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
