'use client';

import { useEffect, useRef, useState } from 'react';
import { HiChatBubbleBottomCenterText, HiChevronUp } from 'react-icons/hi2';
import { RiSpeakAiFill, RiSpeakAiLine } from 'react-icons/ri';

import { Button } from '@repo/ui';
import { useChatStore } from '@/lib/stores/chat-store';
import RecordingMicButton from './RecordingMicButton';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { useLocale } from '@/lib/providers/LocaleProvider';

interface ChatWidgetProps {
  className?: string;
  siteToken?: string; // Site token for authentication
}

export default function ChatWidget({ className = '', siteToken }: ChatWidgetProps) {
  const messagesContainer = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChatButtons, setShowChatButtons] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);
  const [showVoiceInputIndicator, setShowVoiceInputIndicator] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);

  const t = useTranslations();
  const { locale } = useLocale();

  const {
    messages,
    isTyping,
    isLoading,
    isRecording,
    sendMessage,
    clearChat,
    isConnected,
    ttsEnabled,
    setSiteToken,
    setChatPanelOpen,
    setTTSEnabled,
    sendTTSControl,
    stopTTSPlayback,
    connectWebSocket,
    disconnectWebSocket,
    setLanguage,
    resumeAudioContext,
    error,
  } = useChatStore();

  // Show voice input indicator when recording starts
  useEffect(() => {
    if (isRecording) {
      setShowVoiceInputIndicator(true);
    } else {
      // Hide after a short delay for smooth transition
      setTimeout(() => setShowVoiceInputIndicator(false), 300);
    }
  }, [isRecording]);

  // Set site token when component mounts
  useEffect(() => {
    if (siteToken) {
      setSiteToken(siteToken);
    }
  }, [siteToken, setSiteToken]);

  // Set language from locale context
  useEffect(() => {
    if (locale) {
      setLanguage(locale);
    }
  }, [locale, setLanguage]);

  // Show chat buttons after 3 seconds (only on initial page load)
  useEffect(() => {
    if (!showChatButtons && messages.length === 0 && !manuallyClosed) {
      const timer = setTimeout(() => {
        setShowChatButtons(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showChatButtons, messages.length, manuallyClosed]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainer.current) {
      messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;
    setShowSuggestions(false); // Hide suggestions when user sends a message
    setMessageText('');
    await sendMessage(message);
  };

  const handleSendMessage = () => {
    if (messageText.trim() && !isLoading && isConnected) {
      handleSubmit(messageText.trim());
    }
  };

  const handleReconnect = async () => {
    setIsConnecting(true);
    try {
      await connectWebSocket(ttsEnabled); // Use current TTS setting
    } catch (error) {
      console.error('Failed to reconnect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleTTS = async () => {
    const newTtsEnabled = !ttsEnabled;

    // If turning OFF TTS, immediately stop current audio playback
    if (!newTtsEnabled) {
      stopTTSPlayback();
    }

    // Update local state first
    setTTSEnabled(newTtsEnabled);

    // If connected, send control message to backend without reconnecting
    if (isConnected) {
      sendTTSControl(newTtsEnabled);
    }
    // If not connected, the TTS setting will be used when connecting
  };

  const openChatPanel = async () => {
    setShowChatPanel(true);
    setShowSuggestions(true);
    setChatPanelOpen(true);

    // Resume audio context on user interaction (for iOS)
    try {
      await resumeAudioContext();
    } catch (error) {
      console.warn('Failed to resume audio context:', error);
    }

    // Initialize WebSocket connection on widget open
    setIsConnecting(true);
    try {
      await connectWebSocket(ttsEnabled); // Use current TTS setting
    } catch (error) {
      console.error('Failed to connect on widget open:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const closeChatPanel = () => {
    setShowChatPanel(false);
    setShowSuggestions(false);
    setMessageText('');
    setManuallyClosed(true);
    setChatPanelOpen(false);

    // Disconnect WebSocket on widget close
    disconnectWebSocket();
    clearChat();
  };

  return (
    // <>div className={`fixed inset-0 pointer-events-none ${className}`}>
    <>
      {/* Chat Panel - Slides up from bottom */}
      <div
        className={`
          fixed z-5 bottom-0 left-0 lg:left-1/6 bg-[#2c2d2d] rounded-t-3xl border border-white/10 
          transform transition-transform duration-500 ease-out pointer-events-auto
          ${showChatPanel ? 'translate-y-0' : 'translate-y-full'}
          h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full lg:w-2/3 flex flex-col
        `}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 relative">
          {/* Left side: Connection Status and TTS Toggle */}
          <div className="relative z-1 flex items-center gap-3">
            <div className="flex items-center gap-2 w-3 lg:w-auto overflow-x-hidden">
              <div
                className={`shrink-0 w-3 h-3 rounded-full transition-colors duration-300 ${
                  isConnecting ? 'bg-orange-400 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-red-400'
                }`}
                title={isConnecting ? t('app.chat.connecting') : isConnected ? t('app.chat.connected') : t('app.chat.disconnected')}
              />
              {isConnecting ? t('app.chat.connecting') : isConnected ? t('app.chat.connected') : t('app.chat.disconnected')}
            </div>

            {/* TTS Toggle Button */}
            <Button
              onClick={handleToggleTTS}
              variant="ghost"
              size="icon"
              disabled={isConnecting}
              className={`hover:bg-white/10 ${ttsEnabled ? 'text-green-400' : 'text-white/50'}`}
              title={ttsEnabled ? 'TTS Enabled - Click to disable' : 'TTS Disabled - Click to enable'}
            >
              {ttsEnabled ? <RiSpeakAiFill className="size-5" /> : <RiSpeakAiLine className="size-5" />}
            </Button>
          </div>

          <h2 className="absolute z-0 inset-0 text-white font-medium flex items-center justify-center">{t('app.chat.title')}</h2>

          <Button
            onClick={closeChatPanel}
            variant="ghost"
            size="icon"
            className="relative z-1 hover:bg-white/10 text-white"
            aria-label={t('app.chat.closeChat')}
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainer} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Show large reconnect button when disconnected */}
          {!isConnected && (
            <div className="text-center py-12 space-y-6">
              <div className="text-violet-400 text-lg bg-violet-400/10 rounded-lg p-4">{t('app.chat.connectionLost')}</div>
              <Button
                onClick={handleReconnect}
                disabled={isConnecting}
                size="lg"
                className="bg-linear-to-r from-violet-600 to-purple-800 hover:from-violet-500 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-8 py-4 rounded-full text-lg disabled:opacity-50"
              >
                {isConnecting ? t('app.chat.connecting') : t('app.chat.reconnect')}
              </Button>
            </div>
          )}

          {/* Show suggestions only when connected */}
          {messages.length === 0 && showSuggestions && isConnected && (
            <div className="text-center text-white/90 py-8 space-y-6">
              <div className="space-y-2">
                <div className="text-xl font-semibold">👋 {t('app.chat.welcome')}</div>
                <p className="text-white/70">{t('app.chat.askMe')}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-white/60">{t('app.chat.tryQuestions')}</p>
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  <Button
                    onClick={() => handleSubmit(t('app.chat.suggestions.whatIsCreastat'))}
                    variant="outline"
                    disabled={!isConnected}
                    className="text-left justify-start px-4 py-3 h-auto bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('app.chat.suggestions.whatIsCreastat')}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(t('app.chat.suggestions.howMuchCost'))}
                    variant="outline"
                    disabled={!isConnected}
                    className="text-left justify-start px-4 py-3 h-auto bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('app.chat.suggestions.howMuchCost')}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(t('app.chat.suggestions.whatFeatures'))}
                    variant="outline"
                    disabled={!isConnected}
                    className="text-left justify-start px-4 py-3 h-auto bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('app.chat.suggestions.whatFeatures')}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(t('app.chat.suggestions.howGetStarted'))}
                    variant="outline"
                    disabled={!isConnected}
                    className="text-left justify-start px-4 py-3 h-auto bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('app.chat.suggestions.howGetStarted')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : msg.type === 'bot' ? 'justify-start' : 'justify-center'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 flex flex-col gap-2 ${
                  msg.type === 'user'
                    ? 'text-right text-white/90 bg-green-400/10 rounded-3xl'
                    : msg.type === 'bot'
                      ? 'text-left text-white/90 bg-purple-400/10 rounded-3xl'
                      : 'text-center text-yellow-400 bg-yellow-400/10 rounded-lg text-sm'
                }`}
              >
                <span dangerouslySetInnerHTML={{ __html: msg.content || '' }} className="message wrap-break-word" />

                {/* Blinking cursor for user messages during transcription */}
                {index === messages.length - 1 && isRecording && msg.type === 'user' && !msg.content && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-white/60 text-sm">{t('app.chat.listening')}</span>
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                  </div>
                )}

                {/* Loading indicator for bot messages when streaming chunks */}
                {index === messages.length - 1 && msg.type === 'bot' && isTyping && isLoading && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-white/60 text-sm">{t('app.chat.thinking')}</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show blinking underscore when waiting for bot response */}
          {messages.length > 0 && (
            <>
              {messages[messages.length - 1].type === 'user' && isLoading && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-white/60 text-sm">{t('app.chat.thinking')}</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            {/* Input Field with Send Button Inside */}
            <div className="relative flex-1">
              {/* Voice input indicator overlay */}
              {showVoiceInputIndicator && (
                <div className="absolute inset-0 rounded-full bg-linear-to-r from-violet-400/20 to-purple-400/20 animate-pulse pointer-events-none z-10"></div>
              )}

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={isRecording ? t('app.chat.listeningSpeak') : t('app.chat.placeholder')}
                className={`w-full py-3 px-4 pr-12 rounded-full bg-white/10 text-white outline-none border-2 ring-none focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
                  isRecording ? 'border-violet-400/50 shadow-lg shadow-violet-400/25' : 'border-white/10 hover:border-white/20'
                }`}
                disabled={isLoading || !isConnected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isLoading || !isConnected}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
              >
                <HiChevronUp className="size-6 text-white" />
              </Button>
            </div>

            {/* Large Microphone Button */}
            <div
              className="relative"
              onClick={async () => {
                // Resume audio context on microphone interaction (for iOS)
                try {
                  await resumeAudioContext();
                } catch (error) {
                  console.warn('Failed to resume audio context on mic click:', error);
                }
              }}
            >
              {showVoiceInputIndicator && (
                <div className="absolute inset-0 rounded-full bg-linear-to-r from-violet-400/30 to-purple-400/30 animate-ping pointer-events-none"></div>
              )}
              <RecordingMicButton />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Buttons - Slide up from bottom */}
      <div
        className={`
          fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-out z-1 pointer-events-auto
          ${showChatButtons ? 'translate-y-0' : 'translate-y-24'}
        `}
      >
        <div className="flex items-center gap-4">
          {/* Open Chat Button */}
          <Button
            onClick={async () => {
              // Resume audio context on button click (for iOS)
              try {
                await resumeAudioContext();
              } catch (error) {
                console.warn('Failed to resume audio context on chat button click:', error);
              }
              await openChatPanel();
            }}
            size="lg"
            className="bg-linear-to-r from-violet-400 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <span className="flex items-center gap-4">
              <HiChatBubbleBottomCenterText />
              {t('app.chat.chatWithAI')}
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
