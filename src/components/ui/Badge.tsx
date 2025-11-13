import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ 
  variant = 'default', 
  size = 'md', 
  className = '', 
  children,
  ...props 
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';
  
  const variantStyles = {
    default: 'bg-[var(--chat-surface)] text-[var(--chat-text)] border border-[var(--chat-border)]',
    success: 'bg-[var(--chat-success)] bg-opacity-20 text-[var(--chat-success)] border border-[var(--chat-success)] border-opacity-30',
    error: 'bg-[var(--chat-error)] bg-opacity-20 text-[var(--chat-error)] border border-[var(--chat-error)] border-opacity-30',
    warning: 'bg-yellow-500 bg-opacity-20 text-yellow-500 border border-yellow-500 border-opacity-30',
    info: 'bg-[var(--chat-primary)] bg-opacity-20 text-[var(--chat-primary)] border border-[var(--chat-primary)] border-opacity-30',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();
  
  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
}
