/**
 * ChatWidgetHeadless component
 * Headless component with render props for custom implementations
 */

import { ChatProvider } from './ChatProvider';
import { useChat } from '../hooks/useChat';
import type { ChatState, ChatActions } from '../hooks/useChat';

export interface ChatWidgetHeadlessProps {
  siteToken: string;
  language?: string;
  ttsEnabled?: boolean;
  wsUrl?: string;
  apiUrl?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  children: (state: ChatState, actions: ChatActions) => React.ReactNode;
}

/**
 * Internal headless component that uses the chat context
 */
function HeadlessUI({
  children,
}: {
  children: (state: ChatState, actions: ChatActions) => React.ReactNode;
}) {
  const [state, actions] = useChat();
  return <>{children(state, actions)}</>;
}

/**
 * ChatWidgetHeadless component
 * Provides chat functionality without any default styling
 * 
 * @example
 * ```tsx
 * <ChatWidgetHeadless siteToken="your-token">
 *   {(state, actions) => (
 *     <div>
 *       <div>
 *         {state.messages.map(msg => (
 *           <div key={msg.id}>
 *             <strong>{msg.type}:</strong> {msg.content}
 *           </div>
 *         ))}
 *       </div>
 *       <input
 *         type="text"
 *         onKeyDown={(e) => {
 *           if (e.key === 'Enter') {
 *             actions.sendMessage(e.currentTarget.value);
 *             e.currentTarget.value = '';
 *           }
 *         }}
 *       />
 *       <button onClick={() => actions.reconnect()}>
 *         {state.isConnected ? 'Connected' : 'Reconnect'}
 *       </button>
 *     </div>
 *   )}
 * </ChatWidgetHeadless>
 * ```
 */
export function ChatWidgetHeadless({
  siteToken,
  language = 'en',
  ttsEnabled = true,
  wsUrl,
  apiUrl,
  onReady,
  onError,
  onConnectionChange,
  children,
}: ChatWidgetHeadlessProps) {
  return (
    <ChatProvider
      siteToken={siteToken}
      config={{
        language,
        ttsEnabled,
        wsUrl,
        apiUrl,
      }}
      onReady={onReady}
      onError={onError}
      onConnectionChange={onConnectionChange}
    >
      <HeadlessUI>{children}</HeadlessUI>
    </ChatProvider>
  );
}
