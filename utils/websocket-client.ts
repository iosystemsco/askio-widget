/**
 * WebSocket client utilities for chat
 */

import type { ServerMessage, SttChunkMessage } from '@/lib/types/chat-ws';

/**
 * Build WebSocket URL from environment variables
 */
export function buildWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error('buildWebSocketUrl can only be called in browser');
  }

  // Get WebSocket configuration from environment
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST;
  const wsPort = process.env.NEXT_PUBLIC_WS_PORT;
  const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/ws';
  const wsProtocol = process.env.NEXT_PUBLIC_WS_PROTOCOL;

  // If full URL is provided, use it directly
  const wsUrl = process.env.NEXT_PUBLIC_BOT_WS_URL;
  if (wsUrl) {
    return wsUrl;
  }

  // Build URL from components
  if (wsHost) {
    const protocol = wsProtocol || (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    const port = wsPort ? `:${wsPort}` : '';
    return `${protocol}//${wsHost}${port}${wsPath}`;
  }

  // Development fallback - use current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${wsPath}`;
}

/**
 * Check if data is binary
 */
export function isBinaryData(data: any): boolean {
  return data instanceof ArrayBuffer || data instanceof Blob || data instanceof Uint8Array;
}

/**
 * Deserialize server message from JSON string
 */
export function deserializeServerMessage(data: string): ServerMessage {
  return JSON.parse(data);
}

/**
 * Serialize client message to JSON string
 */
export function serializeClientMessage(message: any): string {
  return JSON.stringify(message);
}

/**
 * Create text message for sending
 */
export function createTextMessage(text: string, sessionId?: string) {
  return {
    type: 'text-message',
    text,
    sessionId,
    timestamp: Date.now(),
  };
}

/**
 * Create end-speech message
 */
export function createEndSpeechMessage(finalText: string, sessionId?: string) {
  return {
    type: 'end-speech',
    finalText,
    sessionId,
    timestamp: Date.now(),
  };
}

/**
 * STT chunk buffer for managing transcription chunks
 */
export class SttChunkBuffer {
  private chunks: SttChunkMessage[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(chunk: SttChunkMessage) {
    this.chunks.push(chunk);
    if (this.chunks.length > this.maxSize) {
      this.chunks.shift();
    }
  }

  /**
   * Get all final (confirmed) text concatenated
   */
  getFinalText(): string {
    return this.chunks
      .filter((chunk) => chunk.isFinal)
      .map((chunk) => chunk.text)
      .join(' ')
      .trim();
  }

  /**
   * Get the latest non-final (interim) text
   */
  getInterimText(): string {
    // Find the last non-final chunk after the last final chunk
    let lastFinalIndex = -1;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i].isFinal) {
        lastFinalIndex = i;
        break;
      }
    }

    // Get all non-final chunks after the last final one
    const interimChunks = this.chunks.slice(lastFinalIndex + 1);
    if (interimChunks.length === 0) return '';

    // Return the latest interim text
    return interimChunks[interimChunks.length - 1]?.text || '';
  }

  /**
   * Get the latest text (final or interim)
   */
  getLatestText(): string {
    if (this.chunks.length === 0) return '';
    return this.chunks[this.chunks.length - 1]?.text || '';
  }

  /**
   * Get complete text (all final + latest interim)
   */
  getCompleteText(): string {
    const finalText = this.getFinalText();
    const interimText = this.getInterimText();

    if (!finalText) return interimText;
    if (!interimText) return finalText;

    return `${finalText} ${interimText}`.trim();
  }

  clear() {
    this.chunks = [];
  }
}
