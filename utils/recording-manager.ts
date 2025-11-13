/**
 * Recording manager for voice input
 */

import { AudioChunkProcessor } from './audio-processor';

export interface RecordingResources {
  mediaRecorder: MediaRecorder;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  audioProcessor: AudioChunkProcessor;
}

/**
 * Start recording audio from microphone
 * Captures raw PCM audio for Cartesia STT
 */
export async function startRecording(
  ws: WebSocket,
  onSilence?: () => void
): Promise<RecordingResources> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.'
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
    },
  });

  // Create audio context with 16kHz sample rate for Cartesia
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });
  
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  
  source.connect(analyser);
  analyser.fftSize = 2048;

  const audioProcessor = new AudioChunkProcessor(ws);
  audioProcessor.startRecording();

  // Use AudioWorklet for better performance (not throttled by browser)
  // AudioWorklet runs in a separate thread and provides consistent timing
  let workletNode: AudioWorkletNode | null = null;
  let chunkCount = 0;
  const startTime = Date.now();

  try {
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
    
    console.log('[Audio] Loading AudioWorklet from inline blob');
    await audioContext.audioWorklet.addModule(workletUrl);
    
    // Create AudioWorklet node
    workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });

    // Handle messages from worklet (PCM audio data)
    // Batch small chunks to reduce WebSocket overhead
    let audioBuffer: ArrayBuffer[] = [];
    const BATCH_SIZE = 16; // Batch 16 chunks = 16 * 128 samples = 2048 samples = 128ms
    
    workletNode.port.onmessage = (event) => {
      const { audioData, length, timestamp } = event.data;
      
      chunkCount++;
      audioBuffer.push(audioData);
      
      // Send when we have enough chunks
      if (audioBuffer.length >= BATCH_SIZE) {
        // Concatenate buffers
        const totalLength = audioBuffer.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) {
          combined.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }
        
        if (chunkCount <= BATCH_SIZE * 2) {
          const elapsed = Date.now() - startTime;
          console.log(`[Audio] Sending batch ${Math.floor(chunkCount / BATCH_SIZE)}: ${combined.byteLength} bytes (${BATCH_SIZE} chunks), elapsed: ${elapsed}ms`);
        }
        
        // Send batched PCM data to WebSocket
        audioProcessor.processAudioChunk(combined.buffer);
        audioBuffer = [];
      }
    };

    // Connect audio nodes
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
    
    console.log('[Audio] AudioWorklet initialized successfully');
  } catch (error) {
    console.error('[Audio] Failed to initialize AudioWorklet, falling back to ScriptProcessorNode:', error);
    
    // Fallback to ScriptProcessorNode if AudioWorklet not supported
    const bufferSize = 2048;
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      chunkCount++;
      if (chunkCount <= 10) {
        const elapsed = Date.now() - startTime;
        console.log(`[Audio] Chunk ${chunkCount} (ScriptProcessor): ${inputData.length} samples, elapsed: ${elapsed}ms`);
      }
      
      // Convert Float32Array to Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      audioProcessor.processAudioChunk(pcmData.buffer);
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    workletNode = processor as any; // Store for cleanup
  }

  // Create a dummy MediaRecorder for compatibility
  const mediaRecorder = {
    state: 'recording' as const,
    start: () => {},
    stop: () => {
      if (workletNode) {
        workletNode.disconnect();
      }
      source.disconnect();
      console.log('[Audio] Stopped recording, chunks processed:', chunkCount);
    },
  } as MediaRecorder;

  // Silence detection
  if (onSilence) {
    setupSilenceDetection(analyser, mediaRecorder, onSilence);
  }

  return {
    mediaRecorder,
    mediaStream: stream,
    audioContext,
    analyser,
    audioProcessor,
  };
}

/**
 * Stop recording and cleanup resources
 */
export function stopRecording(resources: Partial<RecordingResources>) {
  if (resources.mediaRecorder && resources.mediaRecorder.state === 'recording') {
    resources.mediaRecorder.stop();
  }

  if (resources.mediaStream) {
    resources.mediaStream.getTracks().forEach((track) => track.stop());
  }

  if (resources.audioContext) {
    resources.audioContext.close().catch(console.error);
  }

  if (resources.audioProcessor) {
    resources.audioProcessor.stopRecording();
  }
}

/**
 * Setup silence detection for auto-stop
 */
function setupSilenceDetection(
  analyser: AnalyserNode,
  mediaRecorder: MediaRecorder,
  onSilence: () => void
) {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  let silenceStartTime = 0;
  const silenceThreshold = 0.03;
  const silenceDuration = 2000;

  const checkForSilence = () => {
    if (mediaRecorder.state !== 'recording') return;

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
 * Get user-friendly error message for recording errors
 */
export function getRecordingErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      return 'Microphone permission denied. Please allow microphone access and try again.';
    } else if (error.name === 'NotFoundError' || error.message.includes('no devices')) {
      return 'No microphone found. Please connect a microphone and try again.';
    } else if (error.name === 'NotReadableError' || error.message.includes('busy')) {
      return 'Microphone is being used by another application. Please close other apps and try again.';
    } else if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }
  return 'Failed to start recording';
}
