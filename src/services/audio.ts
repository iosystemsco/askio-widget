/**
 * Audio processing service for TTS playback
 * Handles PCM to AudioBuffer conversion and playback queue management
 */

export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private userInteracted: boolean = false;

  /**
   * Initialize audio context
   * Must be called after user interaction on iOS
   */
  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if suspended (required for iOS)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('[AudioPlayback] AudioContext resumed');
      } catch (error) {
        console.warn('[AudioPlayback] Failed to resume AudioContext:', error);
      }
    }

    // Mark that user has interacted (for iOS audio policy)
    this.userInteracted = true;
  }

  /**
   * Play audio chunk from TTS
   * @param data Raw PCM audio data or Blob
   */
  async playAudioChunk(data: ArrayBuffer | Blob): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    // Ensure audio context is running (iOS requirement)
    if (this.audioContext && this.audioContext.state !== 'running') {
      try {
        await this.audioContext.resume();
        console.log('[AudioPlayback] AudioContext resumed before playing chunk');
      } catch (error) {
        console.warn('[AudioPlayback] Failed to resume AudioContext before playing:', error);
      }
    }

    // On iOS, we need user interaction before playing audio
    if (!this.userInteracted && this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[AudioPlayback] Waiting for user interaction before playing audio on iOS');
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
        console.log('[AudioPlayback] Audio chunk queued, waiting for user interaction');
        return;
      } catch (error) {
        console.error('[AudioPlayback] Error queuing audio:', error);
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
      // Backend sends PCM signed 16-bit little-endian at 24000 Hz
      const audioBuffer = this.pcmToAudioBuffer(arrayBuffer, 24000, 1);

      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        // Use setTimeout to ensure async playNext is called properly
        setTimeout(() => this.playNext(), 0);
      }
    } catch (error) {
      console.error('[AudioPlayback] Error processing audio:', error);
      throw error;
    }
  }

  /**
   * Convert raw PCM data to AudioBuffer
   * @param arrayBuffer Raw PCM data (16-bit signed little-endian)
   * @param sampleRate Sample rate in Hz
   * @param channels Number of channels (1 for mono, 2 for stereo)
   */
  private pcmToAudioBuffer(
    arrayBuffer: ArrayBuffer,
    sampleRate: number,
    channels: number
  ): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Create Int16Array view of the data
    const pcmData = new Int16Array(arrayBuffer);

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      channels,
      pcmData.length / channels,
      sampleRate
    );

    // Convert 16-bit PCM to float32 (-1.0 to 1.0)
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0; // Convert to -1.0 to 1.0 range
    }

    return audioBuffer;
  }

  /**
   * Play next audio buffer in queue
   */
  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.currentSource = null;
      return;
    }

    // Ensure audio context is running before playing (iOS requirement)
    if (this.audioContext && this.audioContext.state !== 'running') {
      try {
        await this.audioContext.resume();
        console.log('[AudioPlayback] AudioContext resumed in playNext');
      } catch (error) {
        console.warn('[AudioPlayback] Failed to resume AudioContext in playNext:', error);
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
   * Stop TTS playback immediately
   * Clears queue and stops current playback
   */
  stopTTS(): void {
    // Clear the queue
    this.audioQueue = [];

    // Stop currently playing audio immediately
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source might already be stopped
        console.log('[AudioPlayback] Stopped current audio source');
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    console.log('[AudioPlayback] Immediately stopped TTS playback');
  }

  /**
   * Force resume audio context after user interaction
   * Call this on user gesture (click, tap, etc.)
   */
  async forceResume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.userInteracted = true;
        console.log('[AudioPlayback] AudioContext force resumed after user interaction');

        // If we have queued audio, start playing
        if (this.audioQueue.length > 0 && !this.isPlaying) {
          setTimeout(() => this.playNext(), 0);
        }
      } catch (error) {
        console.warn('[AudioPlayback] Failed to force resume AudioContext:', error);
      }
    }
  }

  /**
   * Full stop and cleanup
   * Used when disconnecting or cleaning up
   */
  stop(): void {
    this.stopTTS();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.userInteracted = false;
  }

  /**
   * Check if audio is currently playing
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Get number of queued audio buffers
   */
  get queueLength(): number {
    return this.audioQueue.length;
  }
}
