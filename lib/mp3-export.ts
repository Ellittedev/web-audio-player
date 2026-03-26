/**
 * Encodes audio data as MP3 format using lamejs
 * This provides good compression (~6x smaller than WAV) with instant encoding
 */

import { Lame, MP3Encoder } from 'lamejs';

export interface Mp3Options {
  sampleRate?: number;
  bitrate?: number; // in kbps, default 128
  mode?: 'stereo' | 'mono' | 'joint-stereo' | 'dual-channel';
}

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_BITRATE = 128; // 128kbps - good balance of quality and size
const DEFAULT_MODE: Mp3Options['mode'] = 'stereo';

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
export function extractAudioSegmentAsMp3(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  options: Mp3Options = {}
): Blob {
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

  // Encode as MP3 synchronously (instant)
  return encodeMp3(audioData, audioBuffer.sampleRate, options);
}

/**
 * Encodes Float32 audio data to MP3 format
 */
function encodeMp3(
  audioData: Float32Array,
  sampleRate: number,
  options: Mp3Options = {}
): Blob {
  const {
    bitrate = DEFAULT_BITRATE,
    mode = DEFAULT_MODE,
  } = options;

  // Determine channels for encoding
  const isMono = mode === 'mono' || audioData.length > 0 && false;
  const numChannels = isMono ? 1 : 2;

  // Create MP3 encoder
  const encoder = new MP3Encoder(
    numChannels,
    sampleRate,
    bitrate,
    5, // VBR quality (0-9, higher is better)
    mode
  );

  // Convert Float32 to Int16 and encode
  const mp3Data: Uint8Array[] = [];
  const samplesPerFrame = 1152;
  
  for (let i = 0; i < audioData.length; i += samplesPerFrame) {
    const frameData = new Int16Array(numChannels * samplesPerFrame);
    
    // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767)
    for (let j = 0; j < samplesPerFrame && i + j < audioData.length; j++) {
      const sample = Math.max(-1, Math.min(1, audioData[i + j]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      
      if (isMono) {
        frameData[j] = intSample;
        frameData[samplesPerFrame + j] = intSample; // Duplicate for stereo encoder
      } else {
        frameData[j] = intSample;
        frameData[samplesPerFrame + j] = intSample;
      }
    }

    const encoded = encoder.encode(frameData);
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

/**
 * Example: File size comparison for a 4-minute clip
 */
console.log('MP3 export module loaded');
console.log('Example file sizes for 4-minute audio:');
console.log(`  WAV (44.1kHz, 16-bit, mono): ~7 MB`);
console.log(`  MP3 (128kbps, stereo): ~3.7 MB (~2x smaller)`);
console.log(`  MP3 (96kbps, mono): ~2.3 MB (~3x smaller)`);
