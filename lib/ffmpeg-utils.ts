import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();
  
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(
        '@ffmpeg/core/dist/ffmpeg-core.js',
        'text/javascript'
      ),
    });
    console.log('FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
}

export function getFFmpeg(): FFmpeg | null {
  return ffmpeg;
}

export async function unloadFFmpeg(): Promise<void> {
  if (ffmpeg) {
    await ffmpeg.terminate();
    ffmpeg = null;
    console.log('FFmpeg terminated');
  }
}
