/**
 * useChat hook
 * Exposes chat functionality as a hook for easy integration
 */

import { useChatContext } from '../components/ChatProvider';
import type { ChatMessage } from '../types/messages';

export interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  isTyping: boolean;
  isRecording: boolean;
  error: string | null;
  sessionId: string | null;
  language: string;
  ttsEnabled: boolean;
}

export interface ChatActions {
  sendMessage: (content: string) => Promise<void>;
  startVoiceInput: (onAudioChunk: (data: ArrayBuffer) => void) => void;
  stopVoiceInput: (finalText?: string) => void;
  clearChat: () => void;
  reconnect: () => Promise<void>;
  setLanguage: (language: string) => void;
  setTTSEnabled: (enabled: boolean) => void;
}

/**
 * Hook to access chat functionality
 * Must be used within a ChatProvider
 * 
 * @returns Tuple of [state, actions]
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [state, actions] = useChat();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => actions.sendMessage('Hello')}>
 *         Send
 *       </button>
 *       {state.messages.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(): [ChatState, ChatActions] {
  const context = useChatContext();

  const state: ChatState = {
    messages: context.messages,
    isConnected: context.isConnected,
    isLoading: context.isLoading,
    isTyping: context.isTyping,
    isRecording: context.isRecording,
    error: context.error,
    sessionId: context.sessionId,
    language: context.language,
    ttsEnabled: context.ttsEnabled,
  };

  const actions: ChatActions = {
    sendMessage: context.sendMessage,
    startVoiceInput: context.startVoiceInput,
    stopVoiceInput: context.stopVoiceInput,
    clearChat: context.clearChat,
    reconnect: context.reconnect,
    setLanguage: context.setLanguage,
    setTTSEnabled: context.setTTSEnabled,
  };

  return [state, actions];
}
