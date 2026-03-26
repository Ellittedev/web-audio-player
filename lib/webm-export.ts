/**
 * Encodes audio data as WebM/Opus format
 * This provides ~10x smaller file sizes than WAV while maintaining good quality
 */

export interface WebmOptions {
  sampleRate?: number;
  bitrate?: number; // in bits per second, default 64kbps for voice
  channels?: 1 | 2;
}

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_BITRATE = 64000; // 64kbps - good balance of quality and size
const DEFAULT_CHANNELS = 1; // Mono is sufficient for most use cases

/**
 * Mixes stereo audio to mono
 */
function mixStereoToMono(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length);
  const mono = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  
  return mono;
}

/**
 * Extracts a segment from an AudioBuffer and exports as WebM/Opus
 */
export async function extractAudioSegmentAsWebm(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  options: WebmOptions = {}
): Promise<Blob> {
  const startSample = Math.floor(startTime * audioBuffer.sampleRate);
  const endSample = Math.min(Math.floor(endTime * audioBuffer.sampleRate), audioBuffer.length);

  if (endSample <= startSample) {
    throw new Error('Invalid time range: endTime must be greater than startTime');
  }

  // Extract the segment
  let audioData: Float32Array;
  const channels = audioBuffer.numberOfChannels;

  if (channels === 1) {
    audioData = audioBuffer.getChannelData(0).slice(startSample, endSample);
  } else {
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    audioData = mixStereoToMono(leftChannel.slice(startSample, endSample), rightChannel.slice(startSample, endSample));
  }

  // Create WebM blob from the extracted segment only
  return createWebmBlob(audioData, audioBuffer.sampleRate, options);
}

/**
 * Creates a WebM/Opus blob from Float32 audio data synchronously
 */
async function createWebmBlob(
  audioData: Float32Array,
  sampleRate: number,
  options: WebmOptions = {}
): Promise<Blob> {
  const { bitrate = DEFAULT_BITRATE, channels = DEFAULT_CHANNELS } = options;

  // Create an AudioBuffer from the extracted segment
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = audioContext.createBuffer(
    channels,
    audioData.length,
    sampleRate
  );

  // Copy data to the buffer
  for (let i = 0; i < channels; i++) {
    const channelData = buffer.getChannelData(i);
    for (let j = 0; j < audioData.length && j < channelData.length; j++) {
      channelData[j] = audioData[j];
    }
  }

  // Create a MediaStreamDestination to capture the audio
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const streamDestination = audioContext.createMediaStreamDestination();
  source.connect(streamDestination);

  // Start recording - captures the ENTIRE buffer (which is just the segment)
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(streamDestination.stream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: bitrate
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const duration = audioData.length / sampleRate;
  
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      
      // Cleanup
      source.disconnect();
      audioContext.close();
      
      resolve(blob);
    };

    recorder.onerror = (e) => {
      source.disconnect();
      audioContext.close();
      reject(e.error || new Error('MediaRecorder error'));
    };

    // Start and stop recording - plays only the segment buffer
    recorder.start();
    source.start(0);
    
    // Stop after the segment duration completes
    setTimeout(() => {
      recorder.stop();
    }, duration * 1000 + 50);
  });
}

/**
 * Decodes WebM/Opus audio from a Blob to AudioBuffer
 */
export async function decodeWebmToAudio(webmBlob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return decodedBuffer;
}

/**
 * Estimates the file size of a WebM export (for UI feedback)
 */
export function estimateWebmSize(durationSeconds: number, bitrate: number = DEFAULT_BITRATE): number {
  // WebM overhead is ~1KB, then bitrate * duration
  const overhead = 1024;
  return overhead + Math.floor((bitrate * durationSeconds) / 8);
}
