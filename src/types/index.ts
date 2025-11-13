/**
 * Type definitions for @ask-io/chat-widget
 * 
 * This module exports all TypeScript types and interfaces used by the chat widget.
 * Import these types when building custom implementations or using TypeScript.
 * 
 * @module types
 * 
 * @example
 * ```typescript
 * import type { ChatWidgetProps, ThemeConfig, ChatMessage } from '@ask-io/chat-widget';
 * 
 * const config: ThemeConfig = {
 *   preset: 'dark',
 *   colors: {
 *     primary: '#6366f1'
 *   }
 * };
 * ```
 */

// Message types
export * from './messages';

// Configuration types
export * from './config';

// Component prop types
export * from './components';

// Hook types
export * from './hooks';

// API and service types
export * from './api';

// Error types
export * from './errors';
