"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Volume, VolumeX, Bookmark, Trash2, Edit2 } from "lucide-react";
import AudioUploader from "@/components/AudioUploader";
import BookmarkModal from "@/components/BookmarkModal";
import ABLoopModal from "@/components/ABLoopModal";
import ABRepeatControls from "@/components/ABRepeatControls";
import { getAllAudios, deleteAudio, type StoredAudio } from "@/lib/storage";

interface CustomTrack {
  id: string;
  title: string;
  src: string;
  duration?: number;
}

interface Bookmark {
  id: string;
  name: string;
  timestamp: number;
  createdAt: number;
}

interface ABLoop {
  id: string;
  name: string;
  aPoint: number;
  bPoint: number;
  createdAt: number;
}

export default function Home() {
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const tracks = customTracks;

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  // Bookmarks: map of trackId -> bookmarks array
  const [trackBookmarks, setTrackBookmarks] = useState<Record<string, Bookmark[]>>({});

  // AB Loops: map of trackId -> loops array
  const [trackLoops, setTrackLoops] = useState<Record<string, ABLoop[]>>({});
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);

  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isABLoopModalOpen, setIsABLoopModalOpen] = useState(false);

  // AB Loop creation state: 'idle' or 'waiting_for_b' (after A is set)
  const [abCreationState, setAbCreationState] = useState<'idle' | 'waiting_for_b'>('idle');
  const [pendingAPoint, setPendingAPoint] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Track blob URLs to revoke on cleanup
  const blobUrls = useRef<Map<string, string>>(new Map());

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem('audioPlayerBookmarks');
      if (storedBookmarks) {
        setTrackBookmarks(JSON.parse(storedBookmarks));
      }
    } catch (error) {
      console.error('Failed to load bookmarks from localStorage:', error);
    }
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('audioPlayerBookmarks', JSON.stringify(trackBookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks to localStorage:', error);
    }
  }, [trackBookmarks]);

  // Load AB loops from localStorage on mount
  useEffect(() => {
    try {
      const storedLoops = localStorage.getItem('audioPlayerABLoops');
      if (storedLoops) {
        setTrackLoops(JSON.parse(storedLoops));
      }
    } catch (error) {
      console.error('Failed to load AB loops from localStorage:', error);
    }
  }, []);

  // Save AB loops to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('audioPlayerABLoops', JSON.stringify(trackLoops));
    } catch (error) {
      console.error('Failed to save AB loops to localStorage:', error);
    }
  }, [trackLoops]);

  // Load active loop from localStorage on mount
  useEffect(() => {
    try {
      const storedActiveLoop = localStorage.getItem('audioPlayerActiveLoop');
      if (storedActiveLoop) {
        setActiveLoopId(JSON.parse(storedActiveLoop));
      }
    } catch (error) {
      console.error('Failed to load active loop from localStorage:', error);
    }
  }, []);

  // Save active loop to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('audioPlayerActiveLoop', JSON.stringify(activeLoopId));
    } catch (error) {
      console.error('Failed to save active loop to localStorage:', error);
    }
  }, [activeLoopId]);

  // Load tracks from IndexedDB on mount
  const loadTracks = useCallback(async () => {
    try {
      const storedAudios = await getAllAudios();
      
      // Convert stored audio data to blob URLs
      const loadedTracks: CustomTrack[] = [];
      for (const storedAudio of storedAudios) {
        const response = await fetch(storedAudio.dataUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        blobUrls.current.set(storedAudio.id, url);
        
        loadedTracks.push({
          id: storedAudio.id,
          title: storedAudio.name.replace(/\.[^/.]+$/, ""),
          src: url,
        });
      }
      
      setCustomTracks(loadedTracks);
    } catch (error) {
      console.error('Failed to load tracks from IndexedDB:', error);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleUploadComplete = (audioFile: { name: string; url: string; id: string }) => {
    const newTrack: CustomTrack = {
      id: audioFile.id,
      title: audioFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
      src: audioFile.url,
    };
    setCustomTracks((prev) => [...prev, newTrack]);
  };

  const handleDeleteTrack = async (trackId: string, trackSrc: string) => {
    // Revoke the blob URL
    const url = blobUrls.current.get(trackId);
    if (url) {
      URL.revokeObjectURL(url);
      blobUrls.current.delete(trackId);
    }

    // Delete from IndexedDB
    await deleteAudio(trackId);

    // Update tracks state
    setCustomTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;

  // Get bookmarks for current track
  const bookmarks = currentTrack ? trackBookmarks[currentTrack.id] || [] : [];

  // Get AB loops for current track
  const loops = currentTrack ? trackLoops[currentTrack.id] || [] : [];

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      setDuration(dur);
      setCurrentTime(0);

      // Auto-play when metadata is loaded if play was requested
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(err => {
          console.error('Auto-play error:', err);
          setIsPlaying(false);
        });
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If metadata is already loaded (readyState >= 2), call handler immediately
    if (audio.readyState >= 2) {
      console.log("Metadata already loaded, calling handleLoadedMetadata");
      handleLoadedMetadata();
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [currentTrackIndex]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current && !isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Play error:', err);
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setCurrentTime(0);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setCurrentTime(0);
  };

  // Bookmark handlers
  const [bookmarkTimestamp, setBookmarkTimestamp] = useState<number>(0);

  const handleAddBookmark = () => {
    setBookmarkTimestamp(currentTime);
    setIsBookmarkModalOpen(true);
  };

  const handleSaveBookmark = (name: string) => {
    if (!currentTrack) return;
    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      name,
      timestamp: bookmarkTimestamp,
      createdAt: Date.now(),
    };
    setTrackBookmarks((prev) => ({
      ...prev,
      [currentTrack.id]: [...(prev[currentTrack.id] || []), newBookmark],
    }));
  };

  const handleJumpToBookmark = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    if (!currentTrack) return;
    setTrackBookmarks((prev) => ({
      ...prev,
      [currentTrack.id]: prev[currentTrack.id]?.filter((b) => b.id !== bookmarkId) || [],
    }));
  };

  // AB Loop handlers
  const handleStartABCreation = (time: number, pointType: 'A' | 'B') => {
    if (pointType === 'A') {
      setPendingAPoint(time);
      setAbCreationState('waiting_for_b');
    } else {
      // B point clicked - create loop
      const aPoint = pendingAPoint;
      const bPoint = time;

      if (bPoint <= aPoint) {
        alert('B point must be after A point. Please try again.');
        setAbCreationState('idle');
        return;
      }

      // Generate default name: "Loop from A to B"
      const defaultName = `Loop from ${formatTime(aPoint)} to ${formatTime(bPoint)}`;
      setIsABLoopModalOpen(true);
    }
  };

  const handleSaveABLoop = (name: string, aPoint: number, bPoint: number) => {
    if (!currentTrack) return;

    // Use the pending A point and B point from the button click
    const finalAPoint = pendingAPoint;
    const finalBPoint = currentTime;

    const newLoop: ABLoop = {
      id: crypto.randomUUID(),
      name,
      aPoint: finalAPoint,
      bPoint: finalBPoint,
      createdAt: Date.now(),
    };
    setTrackLoops((prev) => ({
      ...prev,
      [currentTrack.id]: [...(prev[currentTrack.id] || []), newLoop],
    }));

    // Reset creation state
    setAbCreationState('idle');
    setPendingAPoint(0);
  };

  const handleDeleteABLoop = (loopId: string) => {
    if (!currentTrack) return;
    setTrackLoops((prev) => ({
      ...prev,
      [currentTrack.id]: prev[currentTrack.id]?.filter((l) => l.id !== loopId) || [],
    }));
    // If deleting the active loop, deactivate it
    if (activeLoopId === loopId) {
      setActiveLoopId(null);
    }
  };

  const handleEditABLoop = (loopId: string, aPoint: number, bPoint: number) => {
    if (!currentTrack) return;
    setTrackLoops((prev) => ({
      ...prev,
      [currentTrack.id]: prev[currentTrack.id]?.map((l) =>
        l.id === loopId ? { ...l, aPoint, bPoint } : l
      ) || [],
    }));
  };

  const handleToggleABLoop = (loopId: string | null) => {
    setActiveLoopId(loopId);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // AB Loop playback logic
  useEffect(() => {
    if (!audioRef.current || !activeLoopId || !isPlaying) return;

    const loop = loops.find((l) => l.id === activeLoopId);
    if (!loop) {
      setActiveLoopId(null);
      return;
    }

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        
        // Check if we've reached B point, loop back to A
        if (currentTime >= loop.bPoint) {
          audioRef.current.currentTime = loop.aPoint;
          setCurrentTime(loop.aPoint);
        }
      }
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [activeLoopId, loops, isPlaying]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col w-full max-w-md flex-col items-center gap-8 py-32 px-6 bg-white dark:bg-black sm:px-12 shadow-lg rounded-xl">
        {/* Track Info */}
        <div className="text-center">
          {currentTrack ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                {currentTrack.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Track {currentTrackIndex + 1} of {tracks.length}
              </p>
            </>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              No track selected. Upload an audio file to start playing.
            </p>
          )}
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={currentTrack?.src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={nextTrack}
          onLoadedMetadata={handleLoadedMetadata}
          onError={(e) => {
            const audioElement = e.target as HTMLAudioElement;
            console.error('Audio error:', audioElement.error);
            setDuration(0);
            setIsPlaying(false);
          }}
          preload="auto"
        />

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={prevTrack}
            className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Previous track"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          </button>

          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white dark:text-black" />
            ) : (
              <Play className="w-8 h-8 text-white dark:text-black" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Next track"
          >
            <ChevronRight className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 w-full">
          <button onClick={toggleMute} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            ) : volume < 0.5 ? (
              <Volume className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            ) : (
              <Volume className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          />
        </div>

        {/* Playlist Section */}
        {tracks.length > 0 && (
          <div className="w-full pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Playlist ({tracks.length} {tracks.length === 1 ? 'track' : 'tracks'})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => {
                    setCurrentTrackIndex(index);
                    setCurrentTime(0);
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors group cursor-pointer ${
                    index === currentTrackIndex
                      ? 'bg-zinc-200 dark:bg-zinc-700'
                      : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 w-6">
                      {index + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {track.title}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack(track.id, track.src);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-opacity"
                    aria-label="Delete track"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AB Repeat Loops Section */}
        <ABRepeatControls
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onSeek={(time) => {
            if (audioRef.current && !isNaN(time)) {
              audioRef.current.currentTime = time;
              setCurrentTime(time);
            }
          }}
          onToggleLoop={handleToggleABLoop}
          activeLoopId={activeLoopId}
          loops={loops}
          onStartABCreation={handleStartABCreation}
          abCreationState={abCreationState}
          onDeleteLoop={handleDeleteABLoop}
          onEditLoop={handleEditABLoop}
        />

        {/* Bookmark Controls */}
        <div className="w-full">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleAddBookmark}
              disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add bookmark"
            >
              <Bookmark className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bookmarks</span>
          </div>

          {/* Bookmarks List */}
          {bookmarks.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
                >
                  <button
                    onClick={() => handleJumpToBookmark(bookmark.timestamp)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Bookmark className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {bookmark.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(bookmark.timestamp)}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-opacity"
                    aria-label="Delete bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {bookmarks.length === 0 && currentTrack && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No bookmarks yet. Click the bookmark icon to add one.
            </p>
          )}
        </div>

        {/* Upload Section */}
        <div className="w-full pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Upload Your Own Audio
          </h3>
          <AudioUploader onUploadComplete={handleUploadComplete} />
        </div>
      </main>

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        onSave={handleSaveBookmark}
        bookmarkTimestamp={bookmarkTimestamp}
      />

      {/* AB Loop Modal */}
      <ABLoopModal
        isOpen={isABLoopModalOpen}
        onClose={() => setIsABLoopModalOpen(false)}
        onSave={handleSaveABLoop}
        initialName={`Loop from ${formatTime(pendingAPoint)} to ${formatTime(currentTime)}`}
      />
    </div>
  );
}
