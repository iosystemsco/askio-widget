import type { ThemePreset, ThemeColors, ThemeConfig, BorderRadius } from '../../types/config';

// Border radius mappings
export const borderRadiusMap: Record<BorderRadius, string> = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

// Predefined theme presets
export const themePresets: Record<ThemePreset, ThemeColors> = {
  default: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    background: '#2c2d2d',
    surface: '#3a3b3b',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    userMessage: 'rgba(34, 197, 94, 0.1)',
    botMessage: 'rgba(168, 85, 247, 0.1)',
    error: '#ef4444',
    success: '#22c55e',
  },
  dark: {
    primary: '#6366f1',
    secondary: '#818cf8',
    background: '#1a1a1a',
    surface: '#262626',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    userMessage: 'rgba(99, 102, 241, 0.15)',
    botMessage: 'rgba(129, 140, 248, 0.15)',
    error: '#ef4444',
    success: '#10b981',
  },
  light: {
    primary: '#7c3aed',
    secondary: '#a78bfa',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: 'rgba(17, 24, 39, 0.7)',
    border: 'rgba(0, 0, 0, 0.1)',
    userMessage: 'rgba(124, 58, 237, 0.1)',
    botMessage: 'rgba(167, 139, 250, 0.1)',
    error: '#dc2626',
    success: '#059669',
  },
  purple: {
    primary: '#9333ea',
    secondary: '#c084fc',
    background: '#1e1b2e',
    surface: '#2d2640',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(147, 51, 234, 0.2)',
    userMessage: 'rgba(147, 51, 234, 0.15)',
    botMessage: 'rgba(192, 132, 252, 0.15)',
    error: '#f43f5e',
    success: '#22c55e',
  },
  green: {
    primary: '#10b981',
    secondary: '#34d399',
    background: '#1a2e1a',
    surface: '#243b24',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(16, 185, 129, 0.2)',
    userMessage: 'rgba(16, 185, 129, 0.15)',
    botMessage: 'rgba(52, 211, 153, 0.15)',
    error: '#ef4444',
    success: '#22c55e',
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    background: '#1a2a3a',
    surface: '#243b4a',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(14, 165, 233, 0.2)',
    userMessage: 'rgba(14, 165, 233, 0.15)',
    botMessage: 'rgba(56, 189, 248, 0.15)',
    error: '#f43f5e',
    success: '#14b8a6',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#fb923c',
    background: '#2a1a1a',
    surface: '#3a2424',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(249, 115, 22, 0.2)',
    userMessage: 'rgba(249, 115, 22, 0.15)',
    botMessage: 'rgba(251, 146, 60, 0.15)',
    error: '#ef4444',
    success: '#22c55e',
  },
};

// Get theme colors from config
export function getThemeColors(config: ThemeConfig): ThemeColors {
  const preset = config.preset || 'default';
  const baseColors = themePresets[preset];
  
  // Merge custom colors with preset
  return {
    ...baseColors,
    ...config.colors,
  };
}

// Apply theme to DOM element
export function applyTheme(element: HTMLElement, config: ThemeConfig): void {
  const colors = getThemeColors(config);
  
  // Apply CSS custom properties
  element.style.setProperty('--chat-primary', colors.primary);
  element.style.setProperty('--chat-secondary', colors.secondary);
  element.style.setProperty('--chat-background', colors.background);
  element.style.setProperty('--chat-surface', colors.surface);
  element.style.setProperty('--chat-text', colors.text);
  element.style.setProperty('--chat-text-secondary', colors.textSecondary);
  element.style.setProperty('--chat-border', colors.border);
  element.style.setProperty('--chat-user-message', colors.userMessage);
  element.style.setProperty('--chat-bot-message', colors.botMessage);
  element.style.setProperty('--chat-error', colors.error);
  element.style.setProperty('--chat-success', colors.success);
  
  // Apply border radius
  if (config.borderRadius) {
    element.style.setProperty('--chat-radius', borderRadiusMap[config.borderRadius]);
  }
  
  // Apply font family
  if (config.fontFamily) {
    element.style.setProperty('--chat-font-family', config.fontFamily);
  }
  
  // Set data attribute for preset-based styling
  if (config.preset) {
    element.setAttribute('data-chat-theme', config.preset);
  }
}

// Remove theme from DOM element
export function removeTheme(element: HTMLElement): void {
  element.style.removeProperty('--chat-primary');
  element.style.removeProperty('--chat-secondary');
  element.style.removeProperty('--chat-background');
  element.style.removeProperty('--chat-surface');
  element.style.removeProperty('--chat-text');
  element.style.removeProperty('--chat-text-secondary');
  element.style.removeProperty('--chat-border');
  element.style.removeProperty('--chat-user-message');
  element.style.removeProperty('--chat-bot-message');
  element.style.removeProperty('--chat-error');
  element.style.removeProperty('--chat-success');
  element.style.removeProperty('--chat-radius');
  element.style.removeProperty('--chat-font-family');
  element.removeAttribute('data-chat-theme');
}
