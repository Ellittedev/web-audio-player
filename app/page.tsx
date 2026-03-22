"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AudioUploader from "@/components/AudioUploader";
import BookmarkModal from "@/components/BookmarkModal";
import ABLoopModal from "@/components/ABLoopModal";
import ABRepeatControls from "@/components/ABRepeatControls";

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

  // Load tracks from localStorage on mount
  useEffect(() => {
    try {
      const storedTracks = localStorage.getItem('audioPlayerTracks');
      if (storedTracks) {
        setCustomTracks(JSON.parse(storedTracks));
      }
    } catch (error) {
      console.error('Failed to load tracks from localStorage:', error);
    }
  }, []);

  // Save tracks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('audioPlayerTracks', JSON.stringify(customTracks));
    } catch (error) {
      console.error('Failed to save tracks to localStorage:', error);
    }
  }, [customTracks]);

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

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;

  // Get bookmarks for current track
  const bookmarks = currentTrack ? trackBookmarks[currentTrack.id] || [] : [];

  // Get AB loops for current track
  const loops = currentTrack ? trackLoops[currentTrack.id] || [] : [];

  const handleUploadComplete = (audioFile: { name: string; url: string; id: string }) => {
    const newTrack: CustomTrack = {
      id: audioFile.id,
      title: audioFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
      src: audioFile.url,
    };
    setCustomTracks((prev) => [...prev, newTrack]);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      console.log("handleLoadedMetadata called, duration:", dur);
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
            disabled={duration > 0 ? undefined : true}
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
            <svg className="w-6 h-6 text-zinc-900 dark:text-zinc-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors shadow-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-8 h-8 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Next track"
          >
            <svg className="w-6 h-6 text-zinc-900 dark:text-zinc-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 w-full">
          <button onClick={toggleMute} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
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
              disabled={!currentTrack || duration === 0}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add bookmark"
            >
              <svg className="w-5 h-5 text-zinc-900 dark:text-zinc-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
              </svg>
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
                    <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
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
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
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
