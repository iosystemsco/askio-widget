/**
 * Recording manager for voice input
 * Handles microphone access, audio capture, and silence detection
 */

export interface RecordingResources {
  mediaStream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  workletNode: AudioWorkletNode | ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode;
}

export interface RecordingOptions {
  onAudioData: (data: ArrayBuffer) => void;
  onSilence?: () => void;
  sampleRate?: number;
  batchSize?: number;
}

export class RecordingManager {
  private resources: RecordingResources | null = null;
  private isRecording: boolean = false;
  private chunkCount: number = 0;
  private startTime: number = 0;
  private silenceDetectionActive: boolean = false;

  /**
   * Start recording audio from microphone
   * @param options Recording configuration
   */
  async startRecording(options: RecordingOptions): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.'
      );
    }

    const sampleRate = options.sampleRate || 16000;
    const batchSize = options.batchSize || 16;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate,
        },
      });

      // Create audio context with specified sample rate
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate,
      });

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      source.connect(analyser);
      analyser.fftSize = 2048;

      this.isRecording = true;
      this.chunkCount = 0;
      this.startTime = Date.now();

      // Try to use AudioWorklet for better performance
      let workletNode: AudioWorkletNode | ScriptProcessorNode | null = null;

      try {
        workletNode = await this.setupAudioWorklet(
          audioContext,
          source,
          options.onAudioData,
          batchSize
        );
        console.log('[Recording] AudioWorklet initialized successfully');
      } catch (error) {
        console.warn('[Recording] AudioWorklet failed, falling back to ScriptProcessorNode:', error);
        workletNode = this.setupScriptProcessor(
          audioContext,
          source,
          options.onAudioData
        );
      }

      this.resources = {
        mediaStream: stream,
        audioContext,
        analyser,
        workletNode,
        source,
      };

      // Setup silence detection if callback provided
      if (options.onSilence) {
        this.setupSilenceDetection(analyser, options.onSilence);
      }

      console.log('[Recording] Started recording');
    } catch (error) {
      this.isRecording = false;
      throw this.createRecordingError(error);
    }
  }

  /**
   * Stop recording and cleanup resources
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    this.silenceDetectionActive = false;

    if (this.resources) {
      // Disconnect audio nodes
      if (this.resources.workletNode) {
        this.resources.workletNode.disconnect();
      }
      if (this.resources.source) {
        this.resources.source.disconnect();
      }

      // Stop all media tracks
      if (this.resources.mediaStream) {
        this.resources.mediaStream.getTracks().forEach((track) => track.stop());
      }

      // Close audio context
      if (this.resources.audioContext) {
        this.resources.audioContext.close().catch(console.error);
      }

      this.resources = null;
    }

    console.log('[Recording] Stopped recording, chunks processed:', this.chunkCount);
  }

  /**
   * Setup AudioWorklet for audio capture
   */
  private async setupAudioWorklet(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    onAudioData: (data: ArrayBuffer) => void,
    batchSize: number
  ): Promise<AudioWorkletNode> {
    // Create AudioWorklet as inline blob to avoid path/CORS issues
    const workletCode = `
      class AudioCaptureProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.chunkCount = 0;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          
          if (!input || !input[0]) {
            return true;
          }

          const inputChannel = input[0];
          
          // Convert Float32Array to Int16Array (PCM 16-bit)
          const pcmData = new Int16Array(inputChannel.length);
          for (let i = 0; i < inputChannel.length; i++) {
            const s = Math.max(-1, Math.min(1, inputChannel[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send PCM data to main thread
          this.port.postMessage({
            audioData: pcmData.buffer,
            length: pcmData.length,
            timestamp: currentTime,
          }, [pcmData.buffer]);

          this.chunkCount++;
          return true;
        }
      }

      registerProcessor('audio-capture-processor', AudioCaptureProcessor);
    `;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);

    await audioContext.audioWorklet.addModule(workletUrl);

    // Create AudioWorklet node
    const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });

    // Handle messages from worklet (PCM audio data)
    // Batch small chunks to reduce overhead
    let audioBuffer: ArrayBuffer[] = [];

    workletNode.port.onmessage = (event) => {
      if (!this.isRecording) return;

      const { audioData } = event.data;

      this.chunkCount++;
      audioBuffer.push(audioData);

      // Send when we have enough chunks
      if (audioBuffer.length >= batchSize) {
        // Concatenate buffers
        const totalLength = audioBuffer.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) {
          combined.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }

        if (this.chunkCount <= batchSize * 2) {
          const elapsed = Date.now() - this.startTime;
          console.log(
            `[Recording] Sending batch ${Math.floor(this.chunkCount / batchSize)}: ${combined.byteLength} bytes (${batchSize} chunks), elapsed: ${elapsed}ms`
          );
        }

        // Send batched PCM data
        onAudioData(combined.buffer);
        audioBuffer = [];
      }
    };

    // Connect audio nodes
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

    // Cleanup blob URL
    URL.revokeObjectURL(workletUrl);

    return workletNode;
  }

  /**
   * Setup ScriptProcessorNode as fallback
   */
  private setupScriptProcessor(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    onAudioData: (data: ArrayBuffer) => void
  ): ScriptProcessorNode {
    const bufferSize = 2048;
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;

      const inputData = e.inputBuffer.getChannelData(0);

      this.chunkCount++;
      if (this.chunkCount <= 10) {
        const elapsed = Date.now() - this.startTime;
        console.log(
          `[Recording] Chunk ${this.chunkCount} (ScriptProcessor): ${inputData.length} samples, elapsed: ${elapsed}ms`
        );
      }

      // Convert Float32Array to Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      onAudioData(pcmData.buffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    return processor;
  }

  /**
   * Setup silence detection for auto-stop
   */
  private setupSilenceDetection(analyser: AnalyserNode, onSilence: () => void): void {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStartTime = 0;
    const silenceThreshold = 0.03;
    const silenceDuration = 2000; // 2 seconds

    this.silenceDetectionActive = true;

    const checkForSilence = () => {
      if (!this.isRecording || !this.silenceDetectionActive) return;

      analyser.getByteTimeDomainData(dataArray);
      let sum = 0.0;

      for (let i = 0; i < bufferLength; i++) {
        const sample = (dataArray[i]! - 128) / 128.0;
        sum += sample * sample;
      }

      const rms = Math.sqrt(sum / bufferLength);

      if (rms < silenceThreshold) {
        if (silenceStartTime === 0) {
          silenceStartTime = Date.now();
        } else if (Date.now() - silenceStartTime > silenceDuration) {
          onSilence();
          return;
        }
      } else {
        silenceStartTime = 0;
      }

      requestAnimationFrame(checkForSilence);
    };

    requestAnimationFrame(checkForSilence);
  }

  /**
   * Create user-friendly error from recording error
   */
  private createRecordingError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        return new Error(
          'Microphone permission denied. Please allow microphone access and try again.'
        );
      } else if (error.name === 'NotFoundError' || error.message.includes('no devices')) {
        return new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.message.includes('busy')) {
        return new Error(
          'Microphone is being used by another application. Please close other apps and try again.'
        );
      } else if (error.message.includes('network')) {
        return new Error('Network error. Please check your connection and try again.');
      }
      return error;
    }
    return new Error('Failed to start recording');
  }

  /**
   * Check if currently recording
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current audio analyser for visualization
   */
  get analyser(): AnalyserNode | null {
    return this.resources?.analyser || null;
  }
}
