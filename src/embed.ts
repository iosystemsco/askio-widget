/**
 * Embed script entry point for CDN bundle (IIFE)
 * This file creates a standalone JavaScript bundle that can be loaded via <script> tag
 */

import './styles/index.css';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChatWidget } from './components/ChatWidget';
import type { ChatConfig, ThemePreset, WidgetPosition } from './types/config';
import { isValidThemePreset, validateThemeConfig } from './types/config';

/**
 * Widget instance interface
 */
interface WidgetInstance {
  destroy: () => void;
  updateConfig: (newConfig: Partial<ChatConfig>) => void;
  open: () => void;
  close: () => void;
}

/**
 * Global API interface
 */
interface AskIOChatAPI {
  init: (config: ChatConfig) => WidgetInstance;
  version: string;
  instances: Map<string, WidgetInstance>;
}

/**
 * Active widget instances
 */
const instances = new Map<string, { root: Root; container: HTMLElement; config: ChatConfig }>();

/**
 * Generate unique instance ID
 */
function generateInstanceId(): string {
  return `askio-chat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Parse configuration from data attributes
 */
function parseDataAttributes(script: Element): Partial<ChatConfig> {
  const config: Partial<ChatConfig> = {};

  // Required: site token
  const siteToken = script.getAttribute('data-askio-token');
  if (siteToken) {
    config.siteToken = siteToken;
  }

  // Optional: theme preset or custom theme
  const themePreset = script.getAttribute('data-askio-theme');
  if (themePreset) {
    if (isValidThemePreset(themePreset)) {
      config.theme = { preset: themePreset as ThemePreset };
    }
  }

  // Optional: language
  const language = script.getAttribute('data-askio-language');
  if (language) {
    config.language = language;
  }

  // Optional: position
  const position = script.getAttribute('data-askio-position');
  const validPositions = ['bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'top-center', 'left-center', 'right-center', 'inline'];
  if (position && validPositions.includes(position)) {
    config.position = position as WidgetPosition;
  }

  // Optional: dimensions
  const width = script.getAttribute('data-askio-width');
  const height = script.getAttribute('data-askio-height');
  const maxWidth = script.getAttribute('data-askio-max-width');
  const maxHeight = script.getAttribute('data-askio-max-height');
  if (width || height || maxWidth || maxHeight) {
    config.dimensions = {
      width: width || undefined,
      height: height || undefined,
      maxWidth: maxWidth || undefined,
      maxHeight: maxHeight || undefined,
    };
  }

  // Optional: hide button
  const hideButton = script.getAttribute('data-askio-hide-button');
  if (hideButton !== null) {
    config.hideButton = hideButton === 'true' || hideButton === '';
  }

  // Optional: enable voice
  const enableVoice = script.getAttribute('data-askio-voice');
  if (enableVoice !== null) {
    config.enableVoice = enableVoice === 'true' || enableVoice === '';
  }

  // Optional: enable TTS
  const enableTTS = script.getAttribute('data-askio-tts');
  if (enableTTS !== null) {
    config.enableTTS = enableTTS === 'true' || enableTTS === '';
  }

  // Optional: auto open
  const autoOpen = script.getAttribute('data-askio-auto-open');
  if (autoOpen !== null) {
    config.autoOpen = autoOpen === 'true' || autoOpen === '';
  }

  // Optional: auto open delay
  const autoOpenDelay = script.getAttribute('data-askio-auto-open-delay');
  if (autoOpenDelay) {
    const delay = parseInt(autoOpenDelay, 10);
    if (!isNaN(delay) && delay >= 0) {
      config.autoOpenDelay = delay;
    }
  }

  // Optional: welcome message
  const welcomeMessage = script.getAttribute('data-askio-welcome');
  if (welcomeMessage) {
    config.welcomeMessage = welcomeMessage;
  }

  // Optional: placeholder
  const placeholder = script.getAttribute('data-askio-placeholder');
  if (placeholder) {
    config.placeholder = placeholder;
  }

  // Optional: suggestions (comma-separated)
  const suggestions = script.getAttribute('data-askio-suggestions');
  if (suggestions) {
    config.suggestions = suggestions.split(',').map(s => s.trim()).filter(Boolean);
  }

  return config;
}

/**
 * Apply default configuration values
 */
function applyDefaults(config: Partial<ChatConfig>): ChatConfig {
  return {
    siteToken: config.siteToken || '',
    language: config.language || 'en',
    theme: config.theme || { preset: 'default' },
    position: config.position || 'bottom-right',
    enableVoice: config.enableVoice ?? false,
    enableTTS: config.enableTTS ?? true,
    autoOpen: config.autoOpen ?? false,
    autoOpenDelay: config.autoOpenDelay ?? 0,
    placeholder: config.placeholder,
    welcomeMessage: config.welcomeMessage,
    suggestions: config.suggestions,
    dimensions: config.dimensions,
    hideButton: config.hideButton,
    title: config.title,
    subtitle: config.subtitle,
    botName: config.botName,
    userName: config.userName,
    wsUrl: config.wsUrl,
    apiUrl: config.apiUrl,
  };
}

/**
 * Validate configuration
 */
function validateConfig(config: ChatConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config.siteToken || config.siteToken.trim() === '') {
    errors.push('siteToken is required');
  }

  // Validate theme if provided
  if (config.theme) {
    const themeValidation = validateThemeConfig(config.theme);
    if (!themeValidation.valid) {
      errors.push(...themeValidation.errors);
    }
  }

  // Validate language
  if (config.language && typeof config.language !== 'string') {
    errors.push('language must be a string');
  }

  // Validate position
  if (config.position) {
    const validPositions = ['bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'top-center', 'left-center', 'right-center', 'inline'];
    if (!validPositions.includes(config.position)) {
      errors.push(`Invalid position placement: ${config.position}`);
    }
  }

  // Validate auto open delay
  if (config.autoOpenDelay !== undefined && (typeof config.autoOpenDelay !== 'number' || config.autoOpenDelay < 0)) {
    errors.push('autoOpenDelay must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create and inject widget container into DOM
 */
function createContainer(instanceId: string, isInline: boolean = false): HTMLElement {
  const container = document.createElement('div');
  container.id = instanceId;
  container.setAttribute('data-askio-widget', 'true');
  
  if (isInline) {
    // Inline mode: container takes up space in the document flow
    container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
    `;
  } else {
    // Floating mode: container is fixed and overlays the page
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
    `;
  }
  
  document.body.appendChild(container);
  return container;
}

/**
 * Render widget into container
 */
function renderWidget(
  container: HTMLElement,
  config: ChatConfig
): { root: Root; widgetRef: { open: () => void; close: () => void } } {
  const root = createRoot(container);
  
  // Create a ref to store widget methods
  const widgetRef: { open: () => void; close: () => void } = {
    open: () => {},
    close: () => {},
  };

  // Render with auto-open handling
  const isInlineMode = config.position === 'inline';
  const initialOpen = config.autoOpen || isInlineMode;
  
  root.render(
    React.createElement(ChatWidget, {
      siteToken: config.siteToken,
      theme: config.theme,
      language: config.language,
      position: config.position || 'bottom-right',
      dimensions: config.dimensions,
      hideButton: config.hideButton,
      initialOpen,
      enableVoice: config.enableVoice,
      enableTTS: config.enableTTS,
      placeholder: config.placeholder,
      welcomeMessage: config.welcomeMessage,
      suggestions: config.suggestions,
      title: config.title,
      subtitle: config.subtitle,
      botName: config.botName,
      userName: config.userName,
      onReady: () => {
        // Handle auto-open with delay
        if (config.autoOpen && config.autoOpenDelay && config.autoOpenDelay > 0) {
          setTimeout(() => {
            widgetRef.open();
          }, config.autoOpenDelay);
        }
      },
      onError: (error: Error) => {
        console.error('[AskIOChat] Widget error:', error);
      },
    })
  );

  return { root, widgetRef };
}

/**
 * Initialize widget instance
 */
function initWidget(config: Partial<ChatConfig>): WidgetInstance {
  // Apply defaults
  const fullConfig = applyDefaults(config);

  // Validate configuration
  const validation = validateConfig(fullConfig);
  if (!validation.valid) {
    const errorMessage = `[AskIOChat] Invalid configuration:\n${validation.errors.join('\n')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Generate instance ID
  const instanceId = generateInstanceId();

  // Check if inline mode
  const isInlineMode = fullConfig.position === 'inline';

  // Create container
  const container = createContainer(instanceId, isInlineMode);

  // Render widget
  const { root, widgetRef } = renderWidget(container, fullConfig);

  // Store instance
  instances.set(instanceId, { root, container, config: fullConfig });

  // Return instance API
  return {
    destroy: () => {
      const instance = instances.get(instanceId);
      if (instance) {
        // Unmount React component
        instance.root.unmount();
        
        // Remove container from DOM
        if (instance.container.parentNode) {
          instance.container.parentNode.removeChild(instance.container);
        }
        
        // Remove from instances map
        instances.delete(instanceId);
      }
    },
    
    updateConfig: (newConfig: Partial<ChatConfig>) => {
      const instance = instances.get(instanceId);
      if (instance) {
        // Merge with existing config
        const updatedConfig = { ...instance.config, ...newConfig };
        
        // Validate updated config
        const validation = validateConfig(updatedConfig);
        if (!validation.valid) {
          console.error('[AskIOChat] Invalid configuration update:', validation.errors);
          return;
        }
        
        // Re-render with updated config
        const { root: newRoot } = renderWidget(instance.container, updatedConfig);
        
        // Update stored instance
        instances.set(instanceId, {
          root: newRoot,
          container: instance.container,
          config: updatedConfig,
        });
      }
    },
    
    open: () => {
      widgetRef.open();
    },
    
    close: () => {
      widgetRef.close();
    },
  };
}

/**
 * Global AskIOChat API
 */
const AskIOChat: AskIOChatAPI = {
  /**
   * Initialize a new chat widget instance
   */
  init: (config: ChatConfig): WidgetInstance => {
    return initWidget(config);
  },

  /**
   * Package version
   */
  version: '1.0.0',

  /**
   * Active instances (for debugging)
   */
  instances: new Map(),
};

// Expose to window for IIFE bundle
if (typeof window !== 'undefined') {
  (window as any).AskIOChat = AskIOChat;
}

/**
 * Auto-initialization from data attributes
 */
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  const autoInit = () => {
    // Find all script tags with data-askio-token attribute
    const scripts = document.querySelectorAll('script[data-askio-token]');
    
    scripts.forEach((script) => {
      // Check if already initialized
      if (script.hasAttribute('data-askio-initialized')) {
        return;
      }
      
      // Parse configuration from data attributes
      const config = parseDataAttributes(script);
      
      // Initialize widget
      try {
        const instance = AskIOChat.init(config as ChatConfig);
        
        // Mark as initialized
        script.setAttribute('data-askio-initialized', 'true');
        
        // Store instance reference on script element for potential cleanup
        (script as any).__askioInstance = instance;
      } catch (error) {
        console.error('[AskIOChat] Auto-initialization failed:', error);
      }
    });
  };

  // Run auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    // DOM is already ready
    autoInit();
  }
}

export default AskIOChat;
