/**
 * Encodes audio data as MP3 format using lamejs
 * This provides good compression (~2x smaller than WAV) with instant encoding
 */

// Import lamejs dynamically to avoid ES module issues
let Mp3Encoder: any;

async function initLameJs() {
  if (!Mp3Encoder) {
    const lamejs = await import('lamejs');
    Mp3Encoder = lamejs.Mp3Encoder || lamejs.default?.Mp3Encoder;
  }
  return Mp3Encoder;
}

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_BITRATE = 128; // 128kbps - good balance of quality and size

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
 * Extracts a segment from an AudioBuffer and exports as MP3
 */
export async function extractAudioSegmentAsMp3(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const startSample = Math.floor(startTime * audioBuffer.sampleRate);
  const endSample = Math.min(Math.floor(endTime * audioBuffer.sampleRate), audioBuffer.length);

  if (endSample <= startSample) {
    throw new Error('Invalid time range: endTime must be greater than startTime');
  }

  // Extract the segment (mix to mono for smaller files)
  let audioData: Float32Array;
  
  if (audioBuffer.numberOfChannels === 1) {
    audioData = audioBuffer.getChannelData(0).slice(startSample, endSample);
  } else {
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    audioData = mixStereoToMono(leftChannel.slice(startSample, endSample), rightChannel.slice(startSample, endSample));
  }

  // Encode as MP3 synchronously (async due to dynamic import)
  return encodeMp3(audioData, audioBuffer.sampleRate);
}

/**
 * Encodes Float32 audio data to MP3 format
 */
async function encodeMp3(audioData: Float32Array, sampleRate: number): Promise<Blob> {
  const Mp3EncoderClass = await initLameJs();
  
  if (!Mp3EncoderClass) {
    throw new Error('Failed to load MP3 encoder');
  }

  const bitrate = DEFAULT_BITRATE;
  
  // Initialize encoder: [channels, sampleRate, bitrate]
  const encoder = new Mp3EncoderClass(1, sampleRate, bitrate);

  // Convert Float32 to Int16 and encode
  const mp3Data: Uint8Array[] = [];
  const samplesPerFrame = 1152;

  for (let i = 0; i < audioData.length; i += samplesPerFrame) {
    const frameSize = Math.min(samplesPerFrame, audioData.length - i);
    const left = new Float32Array(frameSize);
    const right = new Float32Array(frameSize);

    // Convert Float32 (-1 to 1) and copy to left/right channels
    for (let j = 0; j < frameSize; j++) {
      const sample = Math.max(-1, Math.min(1, audioData[i + j]));
      left[j] = sample;
      right[j] = sample; // Duplicate for mono encoded as stereo
    }

    const encoded = encoder.encodeBuffer(left, right);
    if (encoded && encoded.length > 0) {
      mp3Data.push(encoded);
    }
  }

  // Flush remaining data
  const finalData = encoder.flush();
  if (finalData && finalData.length > 0) {
    mp3Data.push(finalData);
  }

  // Combine all MP3 frames
  const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([result], { type: 'audio/mpeg' });
}

/**
 * Decodes MP3 data from a Blob to AudioBuffer
 */
export async function decodeMp3ToAudio(mp3Blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await mp3Blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return decodedBuffer;
}

/**
 * Estimates the file size of an MP3 export (for UI feedback)
 */
export function estimateMp3Size(durationSeconds: number, bitrateKbps: number = DEFAULT_BITRATE): number {
  // MP3 overhead is ~128 bytes for ID3 tags, then bitrate * duration
  const overhead = 128;
  return overhead + Math.floor((bitrateKbps * 1000 / 8) * durationSeconds);
}

console.log('MP3 export module loaded');
console.log('Example file sizes for 4-minute audio:');
console.log(`  WAV (44.1kHz, 16-bit, mono): ~7 MB`);
console.log(`  MP3 (128kbps, mono): ~2.3 MB (~3x smaller)`);
