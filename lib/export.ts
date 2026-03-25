import JSZip from 'jszip';
import { getAllAudios, type StoredAudio } from './storage';

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
  let trackBookmarks: Record<string, ExportedBookmark[]> = {};
  try {
    const storedBookmarks = localStorage.getItem('audioPlayerBookmarks');
    if (storedBookmarks) {
      trackBookmarks = JSON.parse(storedBookmarks);
    }
  } catch (error) {
    console.error('Failed to load bookmarks for export:', error);
  }
  
  // Get AB loops from localStorage
  let trackLoops: Record<string, ExportedABLoop[]> = {};
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
