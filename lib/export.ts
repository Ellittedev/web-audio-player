import JSZip from 'jszip';
import { getAllAudios } from './storage';
import { extractAudioSegmentAsMp3 } from './mp3-export';

export interface ExportMetadata {
  version: string;
  exportedAt: number;
  audioCount: number;
  bookmarkCount: number;
  loopCount: number;
}

export interface ExportedBookmark {
  id: string;
  name: string;
  timestamp: number;
  createdAt: number;
  _audioFile?: string; // Internal field for export association
}

export interface ExportedABLoop {
  id: string;
  name: string;
  aPoint: number;
  bPoint: number;
  createdAt: number;
  _audioFile?: string; // Internal field for export association
}

export interface LoopExportInfo {
  loopId: string;
  loopName: string;
  trackTitle: string;
  startTime: number;
  endTime: number;
  blob: Blob;
}

export type TrackLoops = Record<string, ABLoop[]>;
export type TrackBookmarks = Record<string, Bookmark[]>;

interface ABLoop {
  id: string;
  name: string;
  aPoint: number;
  bPoint: number;
  createdAt: number;
}

interface Bookmark {
  id: string;
  name: string;
  timestamp: number;
  createdAt: number;
}

export async function exportConfiguration(): Promise<Blob> {
  const zip = new JSZip();

  // Get all audios from IndexedDB
  const storedAudios = await getAllAudios();

  // Add audio files to zip
  for (const audio of storedAudios) {
    try {
      const response = await fetch(audio.dataUrl);
      const blob = await response.blob();
      zip.file(audio.name, blob);
    } catch (error) {
      console.error(`Failed to add audio ${audio.name} to zip:`, error);
    }
  }

  // Get bookmarks from localStorage
  let trackBookmarks: TrackBookmarks = {};
  try {
    const storedBookmarks = localStorage.getItem('audioPlayerBookmarks');
    if (storedBookmarks) {
      trackBookmarks = JSON.parse(storedBookmarks);
    }
  } catch (error) {
    console.error('Failed to load bookmarks for export:', error);
  }

  // Get AB loops from localStorage
  let trackLoops: TrackLoops = {};
  try {
    const storedLoops = localStorage.getItem('audioPlayerABLoops');
    if (storedLoops) {
      trackLoops = JSON.parse(storedLoops);
    }
  } catch (error) {
    console.error('Failed to load AB loops for export:', error);
  }

  // Combine all bookmarks and loops with their associated audio filenames
  const allBookmarks: ExportedBookmark[] = [];
  const allLoops: ExportedABLoop[] = [];

  for (const [trackId, bookmarks] of Object.entries(trackBookmarks)) {
    const audio = storedAudios.find(a => a.id === trackId);
    if (audio) {
      for (const bookmark of bookmarks) {
        allBookmarks.push({
          ...bookmark,
          _audioFile: audio.name // Internal field to associate with audio
        });
      }
    }
  }

  for (const [trackId, loops] of Object.entries(trackLoops)) {
    const audio = storedAudios.find(a => a.id === trackId);
    if (audio) {
      for (const loop of loops) {
        allLoops.push({
          ...loop,
          _audioFile: audio.name // Internal field to associate with audio
        });
      }
    }
  }

  // Create metadata JSON
  const metadata: ExportMetadata = {
    version: '0.2',
    exportedAt: Date.now(),
    audioCount: storedAudios.length,
    bookmarkCount: allBookmarks.length,
    loopCount: allLoops.length
  };

  // Create meta.json with bookmarks and loops data
  const exportData = {
    metadata,
    audios: storedAudios.map(a => ({
      id: a.id,
      name: a.name,
      size: a.size,
      type: a.type
    })),
    bookmarks: allBookmarks,
    loops: allLoops
  };

  zip.file('meta.json', JSON.stringify(exportData, null, 2));

  // Generate the zip file
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}

export function downloadExport(blob: Blob, filename: string = 'audio-player-export.zip') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single loop export as MP3 file (compressed format)
 */
export function downloadLoopExport(exportInfo: LoopExportInfo) {
  const filename = `${sanitizeFilename(exportInfo.trackTitle)}_${sanitizeFilename(exportInfo.loopName)}.mp3`;
  downloadExport(exportInfo.blob, filename);
}

/**
 * Downloads multiple loop exports as a ZIP file
 */
export function downloadAllLoopExports(exportInfos: LoopExportInfo[]) {
  const zip = new JSZip();

  for (const exportInfo of exportInfos) {
    const filename = `${sanitizeFilename(exportInfo.trackTitle)}_${sanitizeFilename(exportInfo.loopName)}.mp3`;
    zip.file(filename, exportInfo.blob);
  }

  zip.generateAsync({ type: 'blob' }).then((content) => {
    downloadExport(content, `loops-export-${Date.now()}.zip`);
  });
}

/**
 * Sanitizes a string to be safe for use in filenames
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 50);
}

/**
 * Decodes audio data from a Blob into an AudioBuffer
 */
async function decodeAudioData(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Exports a single loop as an MP3 file (compressed format)
 */
export async function exportLoopAsAudio(
  trackId: string,
  loopId: string,
  trackSrc: string,
  trackTitle: string,
  aPoint: number,
  bPoint: number
): Promise<LoopExportInfo> {
  try {
    const audioBuffer = await decodeAudioData(await fetch(trackSrc).then(r => r.blob()));

    const blob = await extractAudioSegmentAsMp3(
      audioBuffer,
      aPoint,
      bPoint
    );

    // Find the loop name from localStorage
    let trackLoops: Record<string, any[]> = {};
    try {
      const storedLoops = localStorage.getItem('audioPlayerABLoops');
      if (storedLoops) {
        trackLoops = JSON.parse(storedLoops);
      }
    } catch (error) {
      console.error('Failed to load loops for export:', error);
    }

    const loopName = trackLoops[trackId]?.find(l => l.id === loopId)?.name || 'Loop';

    return {
      loopId,
      loopName,
      trackTitle,
      startTime: aPoint,
      endTime: bPoint,
      blob
    };
  } catch (error) {
    console.error('Failed to export loop:', error);
    throw error;
  }
}

/**
 * Exports all loops from a track as individual MP3 files in a ZIP archive
 */
export async function exportAllLoopsAsZip(
  tracks: Array<{ id: string; title: string; src: string }>,
  trackBookmarks: Record<string, any[]>,
  trackLoops: Record<string, any[]>
): Promise<Blob> {
  const zip = new JSZip();
  const exportInfos: LoopExportInfo[] = [];

  for (const track of tracks) {
    const loops = trackLoops[track.id] || [];

    for (const loop of loops) {
      try {
        const blob = await fetch(track.src).then(r => r.blob());
        const audioBuffer = await decodeAudioData(blob);

        const segmentBlob = await extractAudioSegmentAsMp3(
          audioBuffer,
          loop.aPoint,
          loop.bPoint
        );

        const exportInfo: LoopExportInfo = {
          loopId: loop.id,
          loopName: loop.name,
          trackTitle: track.title,
          startTime: loop.aPoint,
          endTime: loop.bPoint,
          blob: segmentBlob
        };

        exportInfos.push(exportInfo);
      } catch (error) {
        console.error(`Failed to export loop ${loop.id}:`, error);
      }
    }
  }

  for (const exportInfo of exportInfos) {
    const filename = `${sanitizeFilename(exportInfo.trackTitle)}_${sanitizeFilename(exportInfo.loopName)}.mp3`;
    zip.file(filename, exportInfo.blob);
  }

  return await zip.generateAsync({ type: 'blob' });
}
