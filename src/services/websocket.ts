/**
 * WebSocket service for chat widget
 * Handles connection, reconnection, and message serialization
 */

import { BatchProcessor } from '../utils/performance';
import type {
  ServerMessage,
  ClientMessage,
  ConnectionAckMessage,
  SttChunkMessage,
  LlmChunkMessage,
  ErrorMessage,
  EndMessage,
  TextResponseMessage,
} from '../types/messages';

export interface WebSocketConfig {
  url: string;
  jwt: string;
  language?: string;
  ttsEnabled?: boolean;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: ServerMessage) => void;
  onBinaryMessage?: (data: ArrayBuffer) => void;
  onConnectionAck?: (message: ConnectionAckMessage) => void;
  onSttChunk?: (message: SttChunkMessage) => void;
  onLlmChunk?: (message: LlmChunkMessage) => void;
  onTextResponse?: (message: TextResponseMessage) => void;
  onErrorMessage?: (message: ErrorMessage) => void;
  onEnd?: (message: EndMessage) => void;
}

export interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class WebSocketError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

export const WebSocketErrorCodes = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SEND_FAILED: 'SEND_FAILED',
} as const;

/**
 * WebSocket service class
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private sessionId: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect: boolean = true;
  private audioBatchProcessor: BatchProcessor<ArrayBuffer> | null = null;

  private reconnectionConfig: ReconnectionConfig = {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  constructor(reconnectionConfig?: Partial<ReconnectionConfig>) {
    if (reconnectionConfig) {
      this.reconnectionConfig = { ...this.reconnectionConfig, ...reconnectionConfig };
    }

    // Initialize audio batch processor
    this.audioBatchProcessor = new BatchProcessor<ArrayBuffer>(
      (batch) => this.sendBatchedAudio(batch),
      {
        batchSize: 16,
        batchDelay: 50,
      }
    );
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildUrl(baseUrl: string, jwt: string, language?: string, ttsEnabled?: boolean): string {
    const url = new URL(baseUrl);
    url.searchParams.set('jwt', jwt);
    if (language) {
      url.searchParams.set('lang', language);
    }
    if (ttsEnabled !== undefined) {
      url.searchParams.set('ttsEnabled', String(ttsEnabled));
    }
    return url.toString();
  }

  /**
   * Get default WebSocket URL from environment
   */
  private getDefaultWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:8080/ws';
    }

    // Try environment variables
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST;
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT;
    const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/ws';
    const wsProtocol = process.env.NEXT_PUBLIC_WS_PROTOCOL;
    const wsUrl = process.env.NEXT_PUBLIC_BOT_WS_URL;

    if (wsUrl) {
      return wsUrl;
    }

    if (wsHost) {
      const protocol = wsProtocol || (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
      const port = wsPort ? `:${wsPort}` : '';
      return `${protocol}//${wsHost}${port}${wsPath}`;
    }

    // Fallback to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${wsPath}`;
  }

  /**
   * Connect to WebSocket
   */
  async connect(config: WebSocketConfig): Promise<void> {
    // Store config for reconnection
    this.config = config;
    this.shouldReconnect = true;

    // Close existing connection
    if (this.ws) {
      this.disconnect();
    }

    try {
      const url = config.url || this.getDefaultWebSocketUrl();
      const fullUrl = this.buildUrl(url, config.jwt, config.language, config.ttsEnabled);

      console.log('[WebSocket] Connecting to:', url);

      this.ws = new WebSocket(fullUrl);

      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error('[WebSocket] Connection timeout');
          this.ws.close();
          const error = new WebSocketError(
            'Connection timeout',
            WebSocketErrorCodes.CONNECTION_TIMEOUT,
            true
          );
          config.onError?.(error);
        }
      }, 10000);

      // Set up event handlers
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        config.onOpen?.();
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnected = false;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Handle unauthorized close (4401)
        if (event.code === 4401) {
          console.log('[WebSocket] Unauthorized - token expired or invalid');
          const error = new WebSocketError(
            'Session expired',
            WebSocketErrorCodes.UNAUTHORIZED,
            true
          );
          config.onError?.(error);
        }

        config.onClose?.(event);

        // Attempt reconnection if appropriate
        if (this.shouldReconnect && event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        const error = new WebSocketError(
          'WebSocket connection error',
          WebSocketErrorCodes.CONNECTION_FAILED,
          true
        );
        config.onError?.(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      throw new WebSocketError(
        'Failed to establish WebSocket connection',
        WebSocketErrorCodes.CONNECTION_FAILED,
        true
      );
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string | ArrayBuffer | Blob): void {
    if (!this.config) return;

    try {
      // Handle binary data (audio)
      if (this.isBinaryData(data)) {
        if (data instanceof Blob) {
          data.arrayBuffer().then((buffer) => {
            this.config?.onBinaryMessage?.(buffer);
          });
        } else {
          this.config.onBinaryMessage?.(data as ArrayBuffer);
        }
        return;
      }

      // Handle JSON messages
      const message = this.deserializeMessage(data as string);

      // Call generic message handler
      this.config.onMessage?.(message);

      // Call specific handlers based on message type
      switch (message.type) {
        case 'connection-ack':
          this.sessionId = (message as ConnectionAckMessage).sessionId;
          this.config.onConnectionAck?.(message as ConnectionAckMessage);
          break;

        case 'stt-chunk':
          this.config.onSttChunk?.(message as SttChunkMessage);
          break;

        case 'llm-chunk':
          this.config.onLlmChunk?.(message as LlmChunkMessage);
          break;

        case 'text':
          this.config.onTextResponse?.(message as TextResponseMessage);
          break;

        case 'error':
          this.config.onErrorMessage?.(message as ErrorMessage);
          break;

        case 'end':
          this.config.onEnd?.(message as EndMessage);
          break;

        case 'renewed':
          // Token renewal handled by auth service
          console.log('[WebSocket] Token renewed');
          break;
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error);
    }
  }

  /**
   * Check if data is binary
   */
  private isBinaryData(data: any): boolean {
    return data instanceof ArrayBuffer || data instanceof Blob || data instanceof Uint8Array;
  }

  /**
   * Deserialize JSON message
   */
  private deserializeMessage(data: string): ServerMessage {
    return JSON.parse(data);
  }

  /**
   * Serialize client message
   */
  private serializeMessage(message: ClientMessage): string {
    return JSON.stringify(message);
  }

  /**
   * Send text message
   */
  sendTextMessage(text: string): void {
    const message: ClientMessage = {
      type: 'text-message',
      text,
      sessionId: this.sessionId || undefined,
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Send end-speech message
   */
  sendEndSpeech(finalText?: string): void {
    const message: ClientMessage = {
      type: 'end-speech',
      finalText,
      sessionId: this.sessionId || undefined,
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Send language change message
   */
  sendLanguageChange(language: string): void {
    const message = {
      type: 'set-language',
      language,
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Send TTS control message
   */
  sendTTSControl(enabled: boolean): void {
    const message = {
      type: 'set-tts',
      ttsEnabled: enabled,
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Send token renewal request
   */
  sendRenewalRequest(): void {
    const message = {
      type: 'renew',
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Send message (JSON or binary)
   */
  send(message: ClientMessage | ArrayBuffer | any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - not connected');
      throw new WebSocketError(
        'WebSocket not connected',
        WebSocketErrorCodes.SEND_FAILED,
        true
      );
    }

    try {
      if (message instanceof ArrayBuffer) {
        // Send binary data
        this.ws.send(message);
      } else if (typeof message === 'object' && 'type' in message) {
        // Send JSON message
        this.ws.send(this.serializeMessage(message));
      } else {
        // Send as-is (for custom messages)
        this.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[WebSocket] Send failed:', error);
      throw new WebSocketError(
        'Failed to send message',
        WebSocketErrorCodes.SEND_FAILED,
        true
      );
    }
  }

  /**
   * Send binary data (audio) with batching
   */
  sendBinary(data: ArrayBuffer, batch: boolean = true): void {
    if (batch && this.audioBatchProcessor) {
      this.audioBatchProcessor.add(data);
    } else {
      this.send(data);
    }
  }

  /**
   * Send batched audio chunks
   */
  private sendBatchedAudio(chunks: ArrayBuffer[]): void {
    if (chunks.length === 0) return;

    // If only one chunk, send directly
    if (chunks.length === 1) {
      this.send(chunks[0]);
      return;
    }

    // Concatenate multiple chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    this.send(combined.buffer);
  }

  /**
   * Flush audio batch immediately
   */
  flushAudioBatch(): void {
    if (this.audioBatchProcessor) {
      this.audioBatchProcessor.flush();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectionConfig.maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    const delay = this.calculateReconnectDelay();
    console.log(`[WebSocket] Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.config) {
        this.connect(this.config).catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const { initialDelay, maxDelay, backoffMultiplier } = this.reconnectionConfig;
    const delay = initialDelay * Math.pow(backoffMultiplier, this.reconnectAttempts);
    return Math.min(delay, maxDelay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Get connection state
   */
  getState(): {
    isConnected: boolean;
    sessionId: string | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Check if connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    if (this.audioBatchProcessor) {
      this.audioBatchProcessor.clear();
    }
    this.config = null;
  }
}
