/**
 * Configuration types for chat widget
 * @module types/config
 */

/**
 * Predefined theme presets
 * 
 * Available presets:
 * - `default`: Purple gradient theme (default)
 * - `dark`: Dark mode with high contrast
 * - `light`: Clean light theme
 * - `purple`: Purple accent theme
 * - `green`: Nature-inspired green theme
 * - `ocean`: Blue/teal theme
 * - `sunset`: Orange/pink gradient theme
 */
export type ThemePreset = 'default' | 'dark' | 'light' | 'purple' | 'green' | 'ocean' | 'sunset';

/**
 * Border radius options for widget styling
 * 
 * Options:
 * - `none`: No border radius (0)
 * - `sm`: Small radius (0.375rem)
 * - `md`: Medium radius (0.5rem)
 * - `lg`: Large radius (0.75rem)
 * - `xl`: Extra large radius (1rem)
 * - `full`: Fully rounded (9999px)
 */
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Theme color configuration
 * 
 * All colors should be valid CSS color values (hex, rgb, rgba, hsl, hsla)
 * 
 * @example
 * ```typescript
 * const colors: ThemeColors = {
 *   primary: '#8b5cf6',
 *   secondary: '#a78bfa',
 *   background: '#2c2d2d',
 *   surface: '#3a3b3b',
 *   text: '#ffffff',
 *   textSecondary: 'rgba(255, 255, 255, 0.7)',
 *   border: 'rgba(255, 255, 255, 0.1)',
 *   userMessage: 'rgba(34, 197, 94, 0.1)',
 *   botMessage: 'rgba(168, 85, 247, 0.1)',
 *   error: '#ef4444',
 *   success: '#22c55e',
 * };
 * ```
 */
export interface ThemeColors {
  /** Primary brand color */
  primary: string;
  /** Secondary brand color */
  secondary: string;
  /** Main background color */
  background: string;
  /** Surface/card background color */
  surface: string;
  /** Primary text color */
  text: string;
  /** Secondary/muted text color */
  textSecondary: string;
  /** Border color */
  border: string;
  /** User message background color */
  userMessage: string;
  /** Bot message background color */
  botMessage: string;
  /** Error state color */
  error: string;
  /** Success state color */
  success: string;
}

/**
 * Theme configuration for the chat widget
 * 
 * You can use a preset theme or customize colors individually.
 * Custom colors will override preset colors.
 * 
 * @example Using a preset
 * ```typescript
 * const theme: ThemeConfig = {
 *   preset: 'dark'
 * };
 * ```
 * 
 * @example Custom colors
 * ```typescript
 * const theme: ThemeConfig = {
 *   preset: 'dark',
 *   colors: {
 *     primary: '#6366f1',
 *     secondary: '#818cf8'
 *   },
 *   borderRadius: 'lg',
 *   fontFamily: 'Inter, sans-serif'
 * };
 * ```
 */
export interface ThemeConfig {
  /** Predefined theme preset to use as base */
  preset?: ThemePreset;
  /** Custom color overrides */
  colors?: Partial<ThemeColors>;
  /** Border radius style */
  borderRadius?: BorderRadius;
  /** Custom font family */
  fontFamily?: string;
}

// Theme validation utilities
export function isValidThemePreset(preset: string): preset is ThemePreset {
  return ['default', 'dark', 'light', 'purple', 'green', 'ocean', 'sunset'].includes(preset);
}

export function isValidBorderRadius(radius: string): radius is BorderRadius {
  return ['none', 'sm', 'md', 'lg', 'xl', 'full'].includes(radius);
}

export function isValidColor(color: string): boolean {
  // Validate hex colors (#RGB, #RRGGBB, #RRGGBBAA)
  const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  if (hexRegex.test(color)) return true;

  // Validate rgb/rgba
  const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  if (rgbRegex.test(color)) return true;

  // Validate hsl/hsla
  const hslRegex = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/;
  if (hslRegex.test(color)) return true;

  return false;
}

export function validateThemeColors(colors: Partial<ThemeColors>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      errors.push(`Color "${key}" must be a string`);
    } else if (!isValidColor(value)) {
      errors.push(`Color "${key}" has invalid format: ${value}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateThemeConfig(config: ThemeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.preset && !isValidThemePreset(config.preset)) {
    errors.push(`Invalid theme preset: ${config.preset}`);
  }

  if (config.borderRadius && !isValidBorderRadius(config.borderRadius)) {
    errors.push(`Invalid border radius: ${config.borderRadius}`);
  }

  if (config.colors) {
    const colorValidation = validateThemeColors(config.colors);
    errors.push(...colorValidation.errors);
  }

  if (config.fontFamily && typeof config.fontFamily !== 'string') {
    errors.push('Font family must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Widget position placement options
 */
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'top-center' | 'left-center' | 'right-center' | 'inline';

/**
 * Widget dimensions configuration
 */
export interface WidgetDimensions {
  /** Widget width (CSS value: px, %, rem, etc.) */
  width?: string;
  /** Widget height (CSS value: px, %, rem, etc.) */
  height?: string;
  /** Maximum width (CSS value) */
  maxWidth?: string;
  /** Maximum height (CSS value) */
  maxHeight?: string;
  /** Minimum width (CSS value) */
  minWidth?: string;
  /** Minimum height (CSS value) */
  minHeight?: string;
}

/**
 * Complete chat widget configuration
 * 
 * This interface defines all available configuration options for the chat widget.
 * Most options have sensible defaults and are optional.
 * 
 * @example
 * ```typescript
 * const config: ChatConfig = {
 *   siteToken: 'your-site-token',
 *   language: 'en',
 *   theme: { preset: 'dark' },
 *   enableVoice: true,
 *   enableTTS: true,
 *   welcomeMessage: 'Hello! How can I help you today?',
 *   suggestions: [
 *     'What are your hours?',
 *     'How much does it cost?',
 *     'Tell me more about your services'
 *   ]
 * };
 * ```
 */
export interface ChatConfig {
  /** Site token for authentication (required) */
  siteToken: string;
  /** WebSocket URL override (optional) */
  wsUrl?: string;
  /** API URL override (optional) */
  apiUrl?: string;
  /** Language code (e.g., 'en', 'es', 'fr') */
  language?: string;
  /** Theme configuration */
  theme?: ThemeConfig;
  /** Widget position on page */
  position?: WidgetPosition;
  /** Widget dimensions (width, height, etc.) */
  dimensions?: WidgetDimensions;
  /** Hide floating button (useful for inline mode) */
  hideButton?: boolean;
  /** Enable voice input */
  enableVoice?: boolean;
  /** Enable text-to-speech */
  enableTTS?: boolean;
  /** Auto-open widget on page load */
  autoOpen?: boolean;
  /** Delay before auto-opening (milliseconds) */
  autoOpenDelay?: number;
  /** Suggested questions to display */
  suggestions?: string[];
  /** Input placeholder text */
  placeholder?: string;
  /** Welcome message */
  welcomeMessage?: string;
  /** Chat header title */
  title?: string;
  /** Chat header subtitle */
  subtitle?: string;
  /** Bot display name */
  botName?: string;
  /** User display name */
  userName?: string;
}
