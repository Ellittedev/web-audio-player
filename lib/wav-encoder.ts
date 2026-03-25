/**
 * Encodes PCM audio data as WAV format
 */

export interface WavOptions {
  sampleRate?: number;
  bitDepth?: 16 | 32;
  channels?: 1 | 2;
}

export function encodeWav(
  audioData: Float32Array,
  sampleRate: number,
  options: WavOptions = {}
): Blob {
  const {
    bitDepth = 16,
    channels = 1,
  } = options;

  const numChannels = channels === 2 ? 2 : 1;
  const bitsPerSample = bitDepth;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample * numChannels;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Chunk size for PCM
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = bitDepth === 16
      ? sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      : sample * 0x7FFFFFFF;

    if (numChannels === 2) {
      // Stereo: interleaved L/R
      view.setInt16(offset, intSample, true);
      view.setInt16(offset + 2, intSample, true);
      offset += 4;
    } else {
      // Mono
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Decodes WAV data from an AudioBuffer
 */
export function decodeAudioToWav(
  audioBuffer: AudioBuffer,
  startSample: number = 0,
  endSample: number = audioBuffer.length
): Blob {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const duration = (endSample - startSample) / sampleRate;

  // Extract audio data and convert to mono if needed
  let audioData: Float32Array;

  if (channels === 1) {
    audioData = audioBuffer.getChannelData(0).slice(startSample, endSample);
  } else {
    // Mix down to mono
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    audioData = new Float32Array(endSample - startSample);

    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = (leftChannel[startSample + i] + rightChannel[startSample + i]) / 2;
    }
  }

  return encodeWav(audioData, sampleRate, { channels: 1 });
}

/**
 * Extracts a segment from an AudioBuffer and exports as WAV
 */
export function extractAudioSegment(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  options: WavOptions = {}
): Blob {
  const startSample = Math.floor(startTime * audioBuffer.sampleRate);
  const endSample = Math.min(Math.floor(endTime * audioBuffer.sampleRate), audioBuffer.length);

  if (endSample <= startSample) {
    throw new Error('Invalid time range: endTime must be greater than startTime');
  }

  return decodeAudioToWav(audioBuffer, startSample, endSample);
}
