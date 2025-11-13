/**
 * @iosystemsco/askio-widget
 *
 * Embeddable AI chat widget for websites with React support.
 *
 * ## Installation
 *
 * ```bash
 * npm install @iosystemsco/askio-widget
 * # or
 * yarn add @iosystemsco/askio-widget
 * # or
 * pnpm add @iosystemsco/askio-widget
 * ```
 *
 * ## Basic Usage
 *
 * ```tsx
 * import { ChatWidget } from '@iosystemsco/askio-widget';
 * import '@iosystemsco/askio-widget/styles';
 *
 * function App() {
 *   return (
 *     <ChatWidget
 *       siteToken="your-site-token"
 *       theme={{ preset: 'dark' }}
 *       language="en"
 *     />
 *   );
 * }
 * ```
 *
 * ## Headless Usage
 *
 * ```tsx
 * import { ChatWidgetHeadless } from '@iosystemsco/askio-widget';
 *
 * function CustomChat() {
 *   return (
 *     <ChatWidgetHeadless siteToken="your-site-token">
 *       {(state, actions) => (
 *         <div>
 *           {state.messages.map(msg => (
 *             <div key={msg.id}>{msg.content}</div>
 *           ))}
 *           <button onClick={() => actions.sendMessage('Hello')}>
 *             Send
 *           </button>
 *         </div>
 *       )}
 *     </ChatWidgetHeadless>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// Import styles
import './styles/index.css';

// Export all types
export * from './types';

// Export theme components and utilities
export { ThemeProvider, useTheme } from './components/theme';
export { themePresets, getThemeColors } from './components/theme/themes';

// Export main components
export { ChatWidget } from './components/ChatWidget';
export { ChatProvider, useChatContext } from './components/ChatProvider';
export { ChatWidgetHeadless } from './components/ChatWidgetHeadless';

// Export hooks
export { useChat } from './hooks/useChat';

/**
 * Package version
 * @public
 */
export const version = '1.0.0';
