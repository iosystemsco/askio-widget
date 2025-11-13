

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ 
  src, 
  alt = 'Avatar', 
  fallback, 
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  const baseStyles = 'inline-flex items-center justify-center rounded-full bg-[var(--chat-primary)] text-white font-medium overflow-hidden';
  
  const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${className}`.trim();
  
  // Get initials from fallback text
  const getInitials = (text?: string): string => {
    if (!text) return '?';
    
    const words = text.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };
  
  return (
    <div className={combinedClassName}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide image on error and show fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span>{getInitials(fallback || alt)}</span>
      )}
    </div>
  );
}
