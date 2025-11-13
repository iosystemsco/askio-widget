import { ReactNode, useEffect, useRef } from 'react';
import { useResponsive, useKeyboardVisible } from '../../hooks/useResponsive';

export interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  enableMobileFullscreen?: boolean;
}

export function ResponsiveContainer({
  children,
  className = '',
  enableMobileFullscreen = true,
}: ResponsiveContainerProps) {
  const { isMobile, isIOS, isAndroid, orientation } = useResponsive();
  const isKeyboardVisible = useKeyboardVisible();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle iOS-specific viewport fixes
  useEffect(() => {
    if (isIOS && containerRef.current) {
      // Fix for iOS Safari address bar
      const updateHeight = () => {
        if (containerRef.current) {
          containerRef.current.style.height = `${window.innerHeight}px`;
        }
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);

      return () => {
        window.removeEventListener('resize', updateHeight);
      };
    }
  }, [isIOS]);

  // Prevent body scroll on mobile when chat is open
  useEffect(() => {
    if (isMobile && enableMobileFullscreen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
      };
    }
  }, [isMobile, enableMobileFullscreen]);

  const containerClasses = [
    className,
    isMobile && enableMobileFullscreen && 'chat-widget-mobile',
    isMobile && 'chat-widget-mobile-safe',
    isIOS && 'chat-widget-ios',
    isAndroid && 'chat-widget-android',
    orientation === 'landscape' && 'chat-widget-landscape',
    'touch-scroll',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      data-keyboard-visible={isKeyboardVisible}
      data-mobile={isMobile}
      data-platform={isIOS ? 'ios' : isAndroid ? 'android' : 'other'}
    >
      {children}
    </div>
  );
}
