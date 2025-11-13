/**
 * @iosystemsco/askio-widget/headless
 *
 * Headless entry point for custom chat implementations.
 * This export provides all the functionality without any default styling,
 * allowing you to build completely custom UIs.
 *
 * ## Usage
 *
 * ```tsx
 * import { ChatWidgetHeadless, useChat } from '@iosystemsco/askio-widget/headless';
 * import type { ChatMessage, ChatState, ChatActions } from '@iosystemsco/askio-widget/headless';
 *
 * function CustomChat() {
 *   return (
 *     <ChatWidgetHeadless siteToken="your-site-token">
 *       {(state, actions) => (
 *         <div className="my-custom-chat">
 *           <div className="messages">
 *             {state.messages.map(msg => (
 *               <div key={msg.id} className={msg.type}>
 *                 {msg.content}
 *               </div>
 *             ))}
 *           </div>
 *           <input
 *             type="text"
 *             onKeyDown={(e) => {
 *               if (e.key === 'Enter') {
 *                 actions.sendMessage(e.currentTarget.value);
 *                 e.currentTarget.value = '';
 *               }
 *             }}
 *           />
 *         </div>
 *       )}
 *     </ChatWidgetHeadless>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export headless components
export { ChatWidgetHeadless } from './components/ChatWidgetHeadless';
export { ChatProvider, useChatContext } from './components/ChatProvider';

// Export hooks
export { useChat } from './hooks/useChat';

/**
 * Package version
 * @public
 */
export const version = '1.0.0';
