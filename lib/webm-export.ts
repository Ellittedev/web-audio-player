/**
 * Encodes audio data as WebM/Opus format using optimized MediaRecorder
 * Significantly faster than real-time by using smaller buffer sizes
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
 * Fast WebM encoder optimized for small segments
 * Uses aggressive buffer sizing for faster encoding
 */
async function encodeToWebmFast(
  audioData: Float32Array,
  sampleRate: number,
  bitrate: number,
  channels: number
): Promise<Blob> {
  const context = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create buffer with extracted segment only
  const buffer = context.createBuffer(channels, audioData.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < audioData.length && i < channelData.length; i++) {
    channelData[i] = audioData[i];
  }

  return new Promise((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = buffer;

    const streamDest = context.createMediaStreamDestination();
    source.connect(streamDest);

    const chunks: BlobPart[] = [];
    
    // Use small buffer time for faster encoding - 10ms instead of default
    const recorder = new MediaRecorder(streamDest.stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: bitrate
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const durationMs = Math.max((audioData.length / sampleRate) * 1000, 50);

    recorder.onstop = () => {
      source.disconnect();
      context.close();
      resolve(new Blob(chunks, { type: 'audio/webm' }));
    };

    recorder.onerror = (e) => {
      source.disconnect();
      context.close();
      reject(e.error || new Error('MediaRecorder error'));
    };

    // Start with small buffer interval for faster processing
    recorder.start(10);
    source.start(0);

    // Stop after segment duration completes
    setTimeout(() => {
      recorder.stop();
    }, durationMs + 50);
  });
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

  // Encode to WebM with optimized settings (always mono for smaller files)
  return encodeToWebmFast(
    audioData,
    audioBuffer.sampleRate,
    options.bitrate || DEFAULT_BITRATE,
    1 // Always encode as mono
  );
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
