/**
 * Audio processing utilities for voice chat
 */

/**
 * Audio chunk processor for streaming audio to WebSocket
 */
export class AudioChunkProcessor {
  private ws: WebSocket;
  private isRecording: boolean = false;
  private chunksSent: number = 0;
  private startTime: number = 0;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  startRecording() {
    this.isRecording = true;
    this.chunksSent = 0;
    this.startTime = Date.now();
  }

  stopRecording() {
    this.isRecording = false;
    console.log(`[AudioProcessor] Stopped. Total chunks sent: ${this.chunksSent}`);
  }

  async processAudioChunk(arrayBuffer: ArrayBuffer) {
    if (!this.isRecording) {
      console.log('[AudioProcessor] Not recording, skipping chunk');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.log('[AudioProcessor] WebSocket not open, state:', this.ws.readyState);
      return;
    }

    try {
      // Send binary audio data directly to WebSocket
      this.ws.send(arrayBuffer);
      this.chunksSent++;

      if (this.chunksSent <= 10) {
        const elapsed = Date.now() - this.startTime;
        console.log(`[AudioProcessor] Sent chunk ${this.chunksSent}: ${arrayBuffer.byteLength} bytes, elapsed: ${elapsed}ms`);
      }
    } catch (error) {
      console.error('[AudioProcessor] Error sending audio chunk:', error);
    }
  }
}

/**
 * Audio playback manager for TTS audio chunks
 */
export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private userInteracted: boolean = false;

  async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if suspended (required for iOS)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('[TTS] AudioContext resumed');
      } catch (error) {
        console.warn('[TTS] Failed to resume AudioContext:', error);
      }
    }

    // Mark that user has interacted (for iOS audio policy)
    this.userInteracted = true;
  }

  async playAudioChunk(data: ArrayBuffer | Blob) {
    if (!this.audioContext) {
      await this.initialize();
    }

    // Ensure audio context is running (iOS requirement)
    if (this.audioContext && this.audioContext.state !== 'running') {
      try {
        await this.audioContext.resume();
        console.log('[TTS] AudioContext resumed before playing chunk');
      } catch (error) {
        console.warn('[TTS] Failed to resume AudioContext before playing:', error);
      }
    }

    // On iOS, we need user interaction before playing audio
    if (!this.userInteracted && this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[TTS] Waiting for user interaction before playing audio on iOS');
      // Queue the audio but don't play until user interacts
      try {
        let arrayBuffer: ArrayBuffer;
        if (data instanceof Blob) {
          arrayBuffer = await data.arrayBuffer();
        } else {
          arrayBuffer = data;
        }
        const audioBuffer = this.pcmToAudioBuffer(arrayBuffer, 24000, 1);
        this.audioQueue.push(audioBuffer);
        console.log('[TTS] Audio chunk queued, waiting for user interaction');
        return;
      } catch (error) {
        console.error('Error queuing audio:', error);
        return;
      }
    }

    try {
      let arrayBuffer: ArrayBuffer;

      // Convert Blob to ArrayBuffer if needed
      if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer();
      } else {
        arrayBuffer = data;
      }

      // Convert raw PCM data to AudioBuffer
      // Backend sends PCM signed 16-bit little-endian at 22050 Hz
      const audioBuffer = this.pcmToAudioBuffer(arrayBuffer, 24000, 1);

      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        // Use setTimeout to ensure async playNext is called properly
        setTimeout(() => this.playNext(), 0);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  /**
   * Convert raw PCM data to AudioBuffer
   * @param arrayBuffer Raw PCM data (16-bit signed little-endian)
   * @param sampleRate Sample rate in Hz
   * @param channels Number of channels (1 for mono, 2 for stereo)
   */
  private pcmToAudioBuffer(arrayBuffer: ArrayBuffer, sampleRate: number, channels: number): AudioBuffer {
    // Create Int16Array view of the data
    const pcmData = new Int16Array(arrayBuffer);

    // Create AudioBuffer
    const audioBuffer = this.audioContext!.createBuffer(channels, pcmData.length / channels, sampleRate);

    // Convert 16-bit PCM to float32 (-1.0 to 1.0)
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0; // Convert to -1.0 to 1.0 range
    }

    return audioBuffer;
  }

  private async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.currentSource = null;
      return;
    }

    // Ensure audio context is running before playing (iOS requirement)
    if (this.audioContext && this.audioContext.state !== 'running') {
      try {
        await this.audioContext.resume();
        console.log('[TTS] AudioContext resumed in playNext');
      } catch (error) {
        console.warn('[TTS] Failed to resume AudioContext in playNext:', error);
      }
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;
    this.currentSource = this.audioContext!.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.audioContext!.destination);

    this.currentSource.onended = () => {
      // Use setTimeout to ensure async playNext is called properly
      setTimeout(() => this.playNext(), 0);
    };

    this.currentSource.start();
  }

  /**
   * Immediately stop TTS playback without closing audio context
   * This allows for quick resume of audio playback
   */
  stopTTS() {
    // Clear the queue
    this.audioQueue = [];

    // Stop currently playing audio immediately
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source might already be stopped
        console.log('[TTS] Stopped current audio source');
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    console.log('[TTS] Immediately stopped TTS playback');
  }

  /**
   * Force resume audio context after user interaction (call this on user gesture)
   */
  async forceResume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.userInteracted = true;
        console.log('[TTS] AudioContext force resumed after user interaction');

        // If we have queued audio, start playing
        if (this.audioQueue.length > 0 && !this.isPlaying) {
          setTimeout(() => this.playNext(), 0);
        }
      } catch (error) {
        console.warn('[TTS] Failed to force resume AudioContext:', error);
      }
    }
  }

  /**
   * Full stop - used when disconnecting or cleaning up
   */
  stop() {
    this.stopTTS();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
