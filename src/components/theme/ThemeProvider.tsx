import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ThemeConfig } from '../../types/config';
import { applyTheme, removeTheme, getThemeColors } from './themes';
import { validateThemeConfig } from '../../types/config';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  colors: ReturnType<typeof getThemeColors>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  theme?: ThemeConfig;
  children: React.ReactNode;
}

export function ThemeProvider({ theme: initialTheme = { preset: 'default' }, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeConfig>(initialTheme);
  const containerRef = useRef<HTMLDivElement>(null);

  // Validate and update theme
  const setTheme = (newTheme: ThemeConfig) => {
    const validation = validateThemeConfig(newTheme);
    
    if (!validation.valid) {
      console.warn('Invalid theme configuration:', validation.errors);
      return;
    }
    
    setThemeState(newTheme);
  };

  // Apply theme to container element
  useEffect(() => {
    if (containerRef.current) {
      applyTheme(containerRef.current, theme);
    }

    return () => {
      if (containerRef.current) {
        removeTheme(containerRef.current);
      }
    };
  }, [theme]);

  const colors = getThemeColors(theme);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div ref={containerRef} className="chat-widget-theme">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
