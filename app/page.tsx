"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Volume, VolumeX, Bookmark, Trash2, Edit2, RotateCcw, Download, SkipForward, SkipBack, Loader2, Settings, Plus, X, CheckCircle } from "lucide-react";
import AudioUploader from "@/components/AudioUploader";
import BookmarkModal from "@/components/BookmarkModal";
import ABLoopModal from "@/components/ABLoopModal";
import EditBookmarkModal from "@/components/EditBookmarkModal";
import EditABLoopModal from "@/components/EditABLoopModal";
import ABRepeatControls from "@/components/ABRepeatControls";
import SwipeableItem from "@/components/SwipeableItem";
import RenameTrackModal from "@/components/RenameTrackModal";
import { getAllAudios, deleteAudio, storeAudio, deleteAllAudios, deleteAllAudiosAllConfigurations, updateAudioName, type StoredAudio } from "@/lib/storage";
import { exportConfiguration, downloadExport, exportLoopAsAudio, downloadLoopExport, exportAllLoopsAsZip } from "@/lib/export";
import { getAllConfigurations, getActiveConfigurationId, setActiveConfigurationId, getConfigurationStorageKeys, initializeDefaultConfiguration, type AudioPlayerConfiguration, createConfiguration, updateConfiguration, deleteConfiguration, deleteAllConfigurations, clearActiveConfigurationId } from "@/lib/configuration";

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Configuration state
  const [activeConfigurationId, setActiveConfigurationIdState] = useState<string | null>(null);
  const [configurations, setConfigurations] = useState<AudioPlayerConfiguration[]>([]);

  // Bookmarks: map of trackId -> bookmarks array (scoped to active configuration)
  const [trackBookmarks, setTrackBookmarks] = useState<Record<string, Bookmark[]>>({});

  // AB Loops: map of trackId -> loops array (scoped to active configuration)
  const [trackLoops, setTrackLoops] = useState<Record<string, ABLoop[]>>({});
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);

  // Loading state for initial track loading
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isABLoopModalOpen, setIsABLoopModalOpen] = useState(false);

  // Edit modal states
  const [isEditBookmarkModalOpen, setIsEditBookmarkModalOpen] = useState(false);
  const [isEditABLoopModalOpen, setIsEditABLoopModalOpen] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingLoopId, setEditingLoopId] = useState<string | null>(null);

  // AB Loop creation state: 'idle' or 'waiting_for_b' (after A is set)
  const [abCreationState, setAbCreationState] = useState<'idle' | 'waiting_for_b'>('idle');
  const [pendingAPoint, setPendingAPoint] = useState<number>(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isLoopExporting, setIsLoopExporting] = useState(false);

  // Configuration section state
  const [isConfigSectionOpen, setIsConfigSectionOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  // Track renaming modal state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [renamingTrackTitle, setRenamingTrackTitle] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);

  // Track blob URLs to revoke on cleanup
  const blobUrls = useRef<Map<string, string>>(new Map());

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Load configurations and initialize on mount
  useEffect(() => {
    const storedConfigs = getAllConfigurations();
    setConfigurations(storedConfigs);

    const activeConfigId = getActiveConfigurationId();
    setActiveConfigurationIdState(activeConfigId);

    // If no active configuration, initialize default
    if (!activeConfigId) {
      const defaultConfig = initializeDefaultConfiguration();
      if (defaultConfig) {
        setActiveConfigurationIdState(defaultConfig.id);
      }
    } else if (storedConfigs.length > 0) {
      // Configs exist with an active one, but verify it still exists
      const existingConfig = storedConfigs.find(c => c.id === activeConfigId);
      if (!existingConfig) {
        // Active config was deleted, use first available
        setActiveConfigurationIdState(storedConfigs[0].id);
        setActiveConfigurationId(storedConfigs[0].id);
      }
    }
  }, []);

  // Load bookmarks from localStorage on mount (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { bookmarksKey } = getConfigurationStorageKeys(activeConfigurationId);
      const storedBookmarks = localStorage.getItem(bookmarksKey);
      if (storedBookmarks) {
        setTrackBookmarks(JSON.parse(storedBookmarks));
      }
    } catch (error) {
      console.error('Failed to load bookmarks from localStorage:', error);
    }
  }, [activeConfigurationId]);

  // Save bookmarks to localStorage whenever they change (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { bookmarksKey } = getConfigurationStorageKeys(activeConfigurationId);
      localStorage.setItem(bookmarksKey, JSON.stringify(trackBookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks to localStorage:', error);
    }
  }, [activeConfigurationId, trackBookmarks]);

  // Load AB loops from localStorage on mount (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { loopsKey } = getConfigurationStorageKeys(activeConfigurationId);
      const storedLoops = localStorage.getItem(loopsKey);
      if (storedLoops) {
        setTrackLoops(JSON.parse(storedLoops));
      }
    } catch (error) {
      console.error('Failed to load AB loops from localStorage:', error);
    }
  }, [activeConfigurationId]);

  // Save AB loops to localStorage whenever they change (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { loopsKey } = getConfigurationStorageKeys(activeConfigurationId);
      localStorage.setItem(loopsKey, JSON.stringify(trackLoops));
    } catch (error) {
      console.error('Failed to save AB loops to localStorage:', error);
    }
  }, [activeConfigurationId, trackLoops]);

  // Load active loop from localStorage on mount (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { activeLoopKey } = getConfigurationStorageKeys(activeConfigurationId);
      const storedActiveLoop = localStorage.getItem(activeLoopKey);
      if (storedActiveLoop) {
        setActiveLoopId(JSON.parse(storedActiveLoop));
      }
    } catch (error) {
      console.error('Failed to load active loop from localStorage:', error);
    }
  }, [activeConfigurationId]);

  // Save active loop to localStorage whenever it changes (scoped to active configuration)
  useEffect(() => {
    if (!activeConfigurationId) return;
    
    try {
      const { activeLoopKey } = getConfigurationStorageKeys(activeConfigurationId);
      localStorage.setItem(activeLoopKey, JSON.stringify(activeLoopId));
    } catch (error) {
      console.error('Failed to save active loop to localStorage:', error);
    }
  }, [activeConfigurationId, activeLoopId]);

  // Load tracks from IndexedDB on mount (scoped to active configuration)
  const loadTracks = useCallback(async () => {
    console.log('loadTracks called with activeConfigurationId:', activeConfigurationId);

    if (!activeConfigurationId) {
      setIsLoadingTracks(false);
      return;
    }

    setIsLoadingTracks(true);
    try {
      console.log('Fetching audios for configuration:', activeConfigurationId);
      const storedAudios = await getAllAudios(activeConfigurationId);
      console.log('Loaded audios:', storedAudios.length);

      // Convert stored audio data to blob URLs
      const loadedTracks: CustomTrack[] = [];
      for (const storedAudio of storedAudios) {
        let url: string;
        let mimeType: string;

        if (storedAudio.usesBlob && storedAudio.blob) {
          // New blob storage - create blob URL directly (fast for large files)
          mimeType = storedAudio.type;
          url = URL.createObjectURL(storedAudio.blob);
          blobUrls.current.set(storedAudio.id, url);
        } else {
          // Legacy dataUrl storage - convert base64 to blob (slow but necessary for old data)
          mimeType = storedAudio.type || 'audio/mpeg';
          const commaIndex = storedAudio.dataUrl!.indexOf(',');
          const meta = storedAudio.dataUrl!.substring(0, commaIndex);
          let base64Data = storedAudio.dataUrl!.substring(commaIndex + 1);

          // Remove any whitespace/newlines from base64 data
          base64Data = base64Data.replace(/\s+/g, '');

          // Convert base64 to blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          url = URL.createObjectURL(blob);
          blobUrls.current.set(storedAudio.id, url);
        }

        loadedTracks.push({
          id: storedAudio.id,
          title: storedAudio.name.replace(/\.[^/.]+$/, ""),
          src: url,
        });
      }

      setCustomTracks(loadedTracks);
      setIsLoadingTracks(false);
    } catch (error) {
      console.error('Failed to load tracks from IndexedDB:', error);
      setIsLoadingTracks(false);
    }
  }, [activeConfigurationId]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleUploadComplete = async (audioFile: { name: string; url: string; id: string }) => {
    if (!activeConfigurationId) {
      alert('No active configuration. Please create or select a configuration first.');
      return;
    }

    const newTrack: CustomTrack = {
      id: audioFile.id,
      title: audioFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
      src: audioFile.url,
    };

    // Note: AudioUploader already stored the audio in IndexedDB with the correct dataUrl.
    // We don't need to store it again here.

    setCustomTracks((prev) => [...prev, newTrack]);
  };

  const handleDeleteTrack = async (trackId: string, trackSrc: string) => {
    if (!activeConfigurationId) {
      alert('No active configuration. Please create or select a configuration first.');
      return;
    }
    
    // Revoke the blob URL
    const url = blobUrls.current.get(trackId);
    if (url) {
      URL.revokeObjectURL(url);
      blobUrls.current.delete(trackId);
    }

    // Delete from IndexedDB (scoped to active configuration)
    await deleteAudio(trackId, activeConfigurationId);

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

  // Speed control handlers
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const resetSpeed = () => {
    setPlaybackSpeed(1.0);
  };

  // Update playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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

  const handleFastForward = () => {
    if (audioRef.current && !isNaN(currentTime)) {
      const newTime = Math.min(currentTime + 5, duration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleFastBackward = () => {
    if (audioRef.current && !isNaN(currentTime)) {
      const newTime = Math.max(currentTime - 5, 0);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
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

  const handleEditBookmarkClick = (bookmarkId: string, name: string, timestamp: number) => {
    setEditingBookmarkId(bookmarkId);
    // Store current values temporarily for editing
    setEditingBookmarkValues(name, timestamp);
    setIsEditBookmarkModalOpen(true);
  };

  const [editingBookmarkName, setEditingBookmarkName] = useState("");
  const [editingBookmarkTimestamp, setEditingBookmarkTimestamp] = useState(0);

  const setEditingBookmarkValues = (name: string, timestamp: number) => {
    setEditingBookmarkName(name);
    setEditingBookmarkTimestamp(timestamp);
  };

  const handleSaveEditBookmark = (name: string, timestamp: number) => {
    if (!currentTrack || !editingBookmarkId) return;
    setTrackBookmarks((prev) => ({
      ...prev,
      [currentTrack.id]: prev[currentTrack.id]?.map((b) =>
        b.id === editingBookmarkId ? { ...b, name, timestamp } : b
      ) || [],
    }));
    setIsEditBookmarkModalOpen(false);
    setEditingBookmarkId(null);
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

  const handleLoopButtonClick = (time: number) => {
    if (abCreationState === 'waiting_for_b') {
      // We're waiting for B point - complete the loop creation
      const aPoint = pendingAPoint;
      const bPoint = time;

      if (bPoint <= aPoint) {
        alert('B point must be after A point. Please try again.');
        setAbCreationState('idle');
        setPendingAPoint(0);
        return;
      }

      // Generate default name: "Loop from A to B"
      const defaultName = `Loop from ${formatTime(aPoint)} to ${formatTime(bPoint)}`;
      setIsABLoopModalOpen(true);
    } else {
      // We're idle - start setting point A
      setPendingAPoint(time);
      setAbCreationState('waiting_for_b');
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

  const handleEditABLoopClick = (loopId: string, name: string, aPoint: number, bPoint: number) => {
    setEditingLoopId(loopId);
    setEditingABLoopValues(name, aPoint, bPoint);
    setIsEditABLoopModalOpen(true);
  };

  const [editingABLoopName, setEditingABLoopName] = useState("");
  const [editingABLoopA, setEditingABLoopA] = useState(0);
  const [editingABLoopB, setEditingABLoopB] = useState(0);

  const setEditingABLoopValues = (name: string, aPoint: number, bPoint: number) => {
    setEditingABLoopName(name);
    setEditingABLoopA(aPoint);
    setEditingABLoopB(bPoint);
  };

  const handleSaveEditABLoop = (name: string, aPoint: number, bPoint: number) => {
    if (!currentTrack || !editingLoopId) return;
    setTrackLoops((prev) => ({
      ...prev,
      [currentTrack.id]: prev[currentTrack.id]?.map((l) =>
        l.id === editingLoopId ? { ...l, name, aPoint, bPoint } : l
      ) || [],
    }));
    setIsEditABLoopModalOpen(false);
    setEditingLoopId(null);
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

  const handleExport = async () => {
    if (!activeConfigurationId) {
      alert('No active configuration to export.');
      return;
    }
    
    setIsExporting(true);
    try {
      const blob = await exportConfiguration(activeConfigurationId);
      downloadExport(blob);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export configuration. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportConfig = async (configId: string, configName: string) => {
    try {
      const blob = await exportConfiguration(configId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${configName.replace(/\s+/g, '-')}-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export configuration');
    }
  };

  const handleExportLoop = async (loopId: string, loopName: string, aPoint: number, bPoint: number) => {
    if (!currentTrack) return;
    if (!activeConfigurationId) {
      alert('No active configuration. Please create or select a configuration first.');
      return;
    }

    setIsLoopExporting(true);
    try {
      const exportInfo = await exportLoopAsAudio(
        currentTrack.id,
        loopId,
        currentTrack.src,
        currentTrack.title,
        aPoint,
        bPoint,
        activeConfigurationId
      );
      downloadLoopExport(exportInfo);
    } catch (error) {
      console.error('Failed to export loop:', error);
      alert('Failed to export loop. Please try again.');
    } finally {
      setIsLoopExporting(false);
    }
  };

  const handleExportAllLoops = async () => {
    if (!currentTrack) return;
    if (!activeConfigurationId) {
      alert('No active configuration. Please create or select a configuration first.');
      return;
    }

    const loops = trackLoops[currentTrack.id] || [];
    if (loops.length === 0) {
      alert('No loops to export for this track.');
      return;
    }

    setIsLoopExporting(true);

    try {
      const blob = await exportAllLoopsAsZip(
        [currentTrack],
        trackBookmarks,
        trackLoops,
        activeConfigurationId
      );
      downloadExport(blob, `loops-export-${Date.now()}.zip`);
    } catch (error) {
      console.error('Failed to export loops:', error);
      alert('Failed to export loops. Please try again.');
    } finally {
      setIsLoopExporting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset everything? This will delete all audios, bookmarks, loops, and configurations.')) {
      return;
    }

    try {
      // Delete all configurations from localStorage
      const configs = await getAllConfigurations();
      for (const config of configs) {
        const { bookmarksKey, loopsKey, activeLoopKey } = getConfigurationStorageKeys(config.id);
        localStorage.removeItem(bookmarksKey);
        localStorage.removeItem(loopsKey);
        localStorage.removeItem(activeLoopKey);
      }
      deleteAllConfigurations(); // Delete all configurations
      clearActiveConfigurationId(); // Clear active config ID

      // Clear all audio data from IndexedDB
      await deleteAllAudiosAllConfigurations();

      // Clear tracks state
      setCustomTracks([]);
      setTrackBookmarks({});
      setTrackLoops({});
      setActiveLoopId(null);
      setConfigurations([]);
      setActiveConfigurationIdState(null);

      // Clear blob URLs
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.current.clear();

      // Reload configurations and initialize default
      const defaultConfig = initializeDefaultConfiguration();
      if (defaultConfig) {
        setConfigurations([defaultConfig]);
        setActiveConfigurationIdState(defaultConfig.id);
      }

      // Reload tracks
      await loadTracks();
    } catch (error) {
      console.error('Failed to reset:', error);
      alert('Failed to reset. Please try again or refresh the page.');
    }
  };

  const handleCreateConfiguration = async (name: string) => {
    console.log('handleCreateConfiguration called with:', name);
    const newConfig = createConfiguration(name);
    console.log('Created new config:', newConfig);
    setConfigurations(prev => [...prev, newConfig]);
    setActiveConfigurationIdState(newConfig.id);
    setActiveConfigurationId(newConfig.id);
  };

  const handleConfigurationChange = (configurationId: string) => {
    console.log('handleConfigurationChange called with:', configurationId);
    setActiveConfigurationIdState(configurationId);
    setActiveConfigurationId(configurationId);
    loadTracks();
  };

  const handleDeleteConfiguration = async (configId: string) => {
    console.log('handleDeleteConfiguration called with:', configId);
    if (configurations.length <= 1) {
      alert('Cannot delete the last configuration');
      return;
    }

    if (!confirm('Are you sure you want to delete this configuration? This will delete all associated audios, bookmarks, and loops.')) {
      return;
    }

    try {
      await deleteAllAudios(configId);
      const { bookmarksKey, loopsKey, activeLoopKey } = getConfigurationStorageKeys(configId);
      localStorage.removeItem(bookmarksKey);
      localStorage.removeItem(loopsKey);
      localStorage.removeItem(activeLoopKey);

      // Delete configuration from localStorage
      deleteConfiguration(configId);

      setConfigurations(prev => prev.filter(config => config.id !== configId));

      // If deleting active config, switch to first one
      if (activeConfigurationId === configId) {
        const newActiveId = configurations.find(c => c.id !== configId)?.id || configurations[0].id;
        setActiveConfigurationIdState(newActiveId);
        setActiveConfigurationId(newActiveId);
        loadTracks();
      }
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleRenameConfiguration = async (configId: string, name: string) => {
    try {
      const updatedConfig = updateConfiguration(configId, { name });
      if (updatedConfig) {
        setConfigurations(prev =>
          prev.map(config =>
            config.id === configId ? updatedConfig : config
          )
        );

        if (activeConfigurationId === configId) {
          setActiveConfigurationIdState(updatedConfig.id);
          setActiveConfigurationId(updatedConfig.id);
        }
      }
    } catch (error) {
      console.error('Failed to rename configuration:', error);
      alert('Failed to rename configuration');
    }
  };

  const startRenaming = (config: AudioPlayerConfiguration) => {
    setIsRenaming(config.id);
    setRenamingName(config.name);
  };

  const saveRename = async () => {
    if (isRenaming && renamingName.trim()) {
      await handleRenameConfiguration(isRenaming, renamingName.trim());
    }
    setIsRenaming(null);
    setRenamingName("");
  };

  const cancelRename = () => {
    setIsRenaming(null);
    setRenamingName("");
  };

  // Track renaming modal handlers
  const startRenamingTrack = (track: CustomTrack) => {
    setRenamingTrackId(track.id);
    setRenamingTrackTitle(track.title);
    setIsRenameModalOpen(true);
  };

  const handleSaveTrackRename = (newName: string) => {
    if (renamingTrackId) {
      updateAudioName(renamingTrackId, newName, activeConfigurationId || configurations[0]?.id || "");
      loadTracks();
    }
    setIsRenameModalOpen(false);
    setRenamingTrackId(null);
    setRenamingTrackTitle("");
  };

  const handleCancelTrackRename = () => {
    setIsRenameModalOpen(false);
    setRenamingTrackId(null);
    setRenamingTrackTitle("");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      // Extract configuration name from zip filename (without extension)
      const zipFilename = file.name.replace(/\.zip$/i, '');
      console.log('[page handleImport] Zip filename:', zipFilename);

      // Load the zip file using JSZip
      const jszip = await import('jszip');
      const zip = new jszip.default();
      const content = await zip.loadAsync(file);

      // Load meta.json
      const metaContent = await content.file('meta.json')?.async('string');
      if (!metaContent) {
        throw new Error('Invalid configuration file: missing meta.json');
      }

      let config;
      try {
        config = JSON.parse(metaContent);
      } catch (parseError) {
        throw new Error('Invalid configuration file: malformed JSON');
      }

      console.log('[page handleImport] Full config object:', config);
      console.log('[page handleImport] config.metadata:', config.metadata);

      // Validate structure
      if (!config.metadata || !config.audios || !Array.isArray(config.bookmarks) || !Array.isArray(config.loops)) {
        throw new Error('Invalid configuration file format');
      }

      // Validate that we have at least one audio file
      if (!config.audios || config.audios.length === 0) {
        throw new Error('Configuration file contains no audio files');
      }

      // Check if this is a configuration export (has configurationName in metadata)
      const isConfigExport = !!config.metadata.configurationName;

      console.log('[page handleImport] isConfigExport:', isConfigExport);
      console.log('[page handleImport] activeConfigurationId:', activeConfigurationId);
      console.log('[page handleImport] config.metadata.configurationName:', config.metadata.configurationName);

      let targetConfigurationId = activeConfigurationId;

      // If importing a configuration export and no active configuration, create new one
      if (isConfigExport && !activeConfigurationId) {
        const newConfig = createConfiguration(zipFilename);
        targetConfigurationId = newConfig.id;
        setActiveConfigurationIdState(newConfig.id);
        setActiveConfigurationId(newConfig.id);
        setConfigurations(prev => [...prev, newConfig]);
        console.log('[page handleImport] Created new config (no active):', newConfig.id);
      }
      // If importing a configuration export and we have an active configuration, create new one
      else if (isConfigExport && activeConfigurationId) {
        // Create new configuration with the zip filename as the name
        const newConfig = createConfiguration(zipFilename);
        targetConfigurationId = newConfig.id;
        setActiveConfigurationIdState(newConfig.id);
        setActiveConfigurationId(newConfig.id);
        setConfigurations(prev => [...prev, newConfig]);
        console.log('[page handleImport] Created new config (has active):', newConfig.id, 'with name:', zipFilename);
      }
      // Legacy import (no configurationName in metadata) - always create new configuration
      else {
        const newConfig = createConfiguration(`Legacy Import ${zipFilename}`);
        targetConfigurationId = newConfig.id;
        setActiveConfigurationIdState(newConfig.id);
        setActiveConfigurationId(newConfig.id);
        setConfigurations(prev => [...prev, newConfig]);
        console.log('[page handleImport] Created new config (legacy):', newConfig.id);
      }

      if (!targetConfigurationId) {
        throw new Error('No target configuration available for import');
      }

      console.log('[page handleImport] Final targetConfigurationId:', targetConfigurationId);

      // Import audios with new unique IDs to avoid duplicate key issues
      const importedAudioIds: Record<string, string> = {}; // oldId -> newId mapping
      let importedCount = 0;
      let storedAudios: StoredAudio[] = [];
      for (const audioInfo of config.audios) {
        // Check if audio already exists in target configuration
        storedAudios = await getAllAudios(targetConfigurationId);
        const existingAudio = storedAudios.find(a => a.id === audioInfo.id);

        if (!existingAudio) {
          // Generate a new unique ID for this audio
          const newAudioId = crypto.randomUUID();
          importedAudioIds[audioInfo.id] = newAudioId;

          // Fetch the audio blob from the zip
          const audioFile = content.file(audioInfo.name);
          if (audioFile) {
            const blob = await audioFile.async('blob');

            // Store blob directly for new import (no base64 conversion)
            const newAudio: StoredAudio = {
              id: newAudioId,
              name: audioInfo.name,
              blob,
              size: audioInfo.size,
              type: audioInfo.type,
              configurationId: targetConfigurationId,
              usesBlob: true // Flag to indicate blob storage
            };

            await storeAudio(newAudio);
            importedCount++;
          }
        }
      }

      // Import bookmarks and loops (associated with imported audios)
      const newBookmarks: Record<string, Bookmark[]> = {};
      const newLoops: Record<string, ABLoop[]> = {};

      // Get all audios after import to match bookmarks/loops with correct audio IDs
      const allAudiosAfterImport = await getAllAudios(targetConfigurationId);

      for (const bookmark of config.bookmarks || []) {
        if (bookmark._audioFile) {
          const audio = allAudiosAfterImport.find(a => a.name === bookmark._audioFile);
          if (audio) {
            if (!newBookmarks[audio.id]) {
              newBookmarks[audio.id] = [];
            }
            newBookmarks[audio.id].push({
              id: bookmark.id,
              name: bookmark.name,
              timestamp: bookmark.timestamp,
              createdAt: bookmark.createdAt
            });
          }
        }
      }

      for (const loop of config.loops || []) {
        if (loop._audioFile) {
          const audio = allAudiosAfterImport.find(a => a.name === loop._audioFile);
          if (audio) {
            if (!newLoops[audio.id]) {
              newLoops[audio.id] = [];
            }
            newLoops[audio.id].push({
              id: loop.id,
              name: loop.name,
              aPoint: loop.aPoint,
              bPoint: loop.bPoint,
              createdAt: loop.createdAt
            });
          }
        }
      }

      // Merge with existing data for target configuration
      setTrackBookmarks(prev => ({
        ...prev,
        ...newBookmarks,
        ...Object.fromEntries(
          Object.entries(prev).map(([key, value]) => [
            key,
            [...value, ...(newBookmarks[key] || [])]
          ])
        )
      }));

      setTrackLoops(prev => ({
        ...prev,
        ...newLoops,
        ...Object.fromEntries(
          Object.entries(prev).map(([key, value]) => [
            key,
            [...value, ...(newLoops[key] || [])]
          ])
        )
      }));

      // Reload tracks from IndexedDB to include newly imported audios
      const updatedAudios = await getAllAudios(targetConfigurationId);
      const updatedTracks: CustomTrack[] = [];
      for (const storedAudio of updatedAudios) {
        let url: string;
        let mimeType: string;

        if (storedAudio.usesBlob && storedAudio.blob) {
          // New blob storage - create blob URL directly
          mimeType = storedAudio.type;
          url = URL.createObjectURL(storedAudio.blob);
          blobUrls.current.set(storedAudio.id, url);
        } else {
          // Legacy dataUrl storage
          const [meta, base64Data] = storedAudio.dataUrl!.split(',');
          mimeType = meta.match(/:(.*?);/)?.[1] || 'audio/mpeg';

          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          url = URL.createObjectURL(blob);
          blobUrls.current.set(storedAudio.id, url);
        }

        updatedTracks.push({
          id: storedAudio.id,
          title: storedAudio.name.replace(/\.[^/.]+$/, ""),
          src: url,
        });
      }
      setCustomTracks(updatedTracks);

      // Clean up blob URLs for imported audios - revoke any old blob URLs
      for (const audio of config.audios) {
        const storedAudio = storedAudios.find(a => a.id === audio.id);
        if (storedAudio) {
          // Revoke blob URL if it exists
          const existingUrl = blobUrls.current.get(storedAudio.id);
          if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
            blobUrls.current.delete(storedAudio.id);
          }
        }
      }

      setImportMessage({
        text: `Successfully imported ${importedCount} new audio(s). Bookmarks and loops have been merged.`,
        error: false
      });
    } catch (error) {
      console.error('Import failed:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to import configuration. Please ensure the file is a valid export.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('not a zip') || errorMsg.includes('invalid') && !errorMsg.includes('json')) {
          errorMessage = 'The file is not a valid configuration export. Please select a valid .zip file.';
        } else if (errorMsg.includes('malformed json')) {
          errorMessage = 'The configuration file contains invalid JSON data.';
        } else if (errorMsg.includes('meta.json')) {
          errorMessage = 'The configuration file is missing required metadata.';
        } else if (errorMsg.includes('no audio files')) {
          errorMessage = 'The configuration file contains no audio files.';
        }
      }
      
      setImportMessage({
        text: errorMessage,
        error: true
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
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

        // If we're before A point, jump to A
        if (currentTime < loop.aPoint) {
          audioRef.current.currentTime = loop.aPoint;
          setCurrentTime(loop.aPoint);
        }
        // Check if we've reached B point, loop back to A
        else if (currentTime >= loop.bPoint) {
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
    <div className="flex flex-col flex-1 items-center justify-center bg-[#0a0014] font-sans relative overflow-hidden">
      {/* Synthwave Grid Floor Background */}
      <div className="grid-floor"></div>

      {/* Ambient Glow Effects */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-40 right-1/4 w-80 h-80 bg-neon-cyan/15 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Loading Screen */}
      {isLoadingTracks && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a0014] z-50">
          <div className="text-center relative z-10">
            <Loader2 className="w-16 h-16 text-neon-pink animate-spin mx-auto mb-4 neon-glow-pink" />
            <p className="text-neon-cyan text-lg font-mono tracking-wider">LOADING AUDIO LIBRARY...</p>
          </div>
        </div>
      )}

      {!isLoadingTracks && (
        <main className="flex flex-col w-full md:max-w-md flex-col items-center gap-6 sm:gap-8 py-8 sm:py-12 px-4 relative z-10">
          {/* Header with Neon Glow */}
          <div className="flex items-center justify-between w-full mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold neon-text-pink tracking-wider">
              AUDIO PLAYER
            </h1>
            <div className="w-2 h-2 bg-neon-cyan rounded-full pulse-glow"></div>
          </div>

        <div className="text-center mb-3 sm:mb-4">
          {currentTrack ? (
            <>
              <h2 className="text-2xl font-semibold neon-text-cyan mb-2 tracking-wide">
                {currentTrack.title}
              </h2>
              <p className="text-sm text-neon-purple font-mono">
                TRACK {currentTrackIndex + 1} OF {tracks.length}
              </p>
            </>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-500 mt-2">
              NO TRACK SELECTED. UPLOAD AN AUDIO FILE TO START PLAYING.
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

        {/* Progress Bar with Neon Styling */}
        <div className="w-full flex items-center gap-3 text-sm font-mono">
          <span className="text-neon-cyan w-12">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
            className="flex-1 h-2 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-neon-purple w-12">{formatTime(duration)}</span>
        </div>

        {/* Controls Container with Neon Border */}
        <div className="w-full mt-4 sm:mt-6 neon-border-pink rounded-2xl p-4 sm:p-6 bg-[#1a0a2e]/80 backdrop-blur-sm">
        {/* Controls */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
          {/* Top row: Bookmark button above play button */}
          <div className="flex justify-center mb-2">
            <button
              onClick={handleAddBookmark}
              disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
              className="p-4 rounded-full btn-neon-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              aria-label="Add bookmark"
            >
              <Bookmark className="w-6 h-6 text-white group-hover:animate-pulse" />
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                ADD BOOKMARK
              </span>
            </button>
          </div>

          {/* Middle row: All navigation buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleFastBackward}
              disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
              className="p-4 rounded-full btn-neon-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              aria-label="Fast backward 5 seconds"
            >
              <SkipBack className="w-6 h-6 text-white" />
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-pink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                -5s
              </span>
            </button>

            <button
              onClick={prevTrack}
              className="p-4 rounded-full btn-neon-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              aria-label="Previous track"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-pink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                PREV
              </span>
            </button>

            <button
              onClick={togglePlay}
              className="p-5 rounded-full btn-neon-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative active-glow"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </button>

            <button
              onClick={nextTrack}
              className="p-4 rounded-full btn-neon-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              aria-label="Next track"
            >
              <ChevronRight className="w-6 h-6 text-white" />
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-pink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                NEXT
              </span>
            </button>

            <button
              onClick={handleFastForward}
              disabled={(currentTrack && duration) ? (!currentTrack || duration === 0) : false}
              className="p-4 rounded-full btn-neon-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
              aria-label="Fast forward 5 seconds"
            >
              <SkipForward className="w-6 h-6 text-white" />
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-pink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                +5s
              </span>
            </button>
          </div>

          {/* Bottom row: Loop button below play button */}
          <div className="flex justify-center mt-3">
            <button
              onClick={() => handleLoopButtonClick(currentTime)}
              className={`p-4 rounded-full transition-all relative group ${
                abCreationState === 'waiting_for_b'
                  ? 'btn-neon-pink active-glow'
                  : 'btn-neon-cyan'
              }`}
              aria-label="Set loop point A"
            >
              <div className="flex items-center justify-center">
                <RotateCcw className={`w-6 h-6 ${
                  abCreationState === 'waiting_for_b'
                    ? 'text-white animate-pulse'
                    : 'text-white'
                }`} />
                <span className={`absolute text-xs font-bold ${
                  abCreationState === 'waiting_for_b'
                    ? 'text-white'
                    : 'text-white'
                }`} style={{ top: '50%', transform: 'translateY(-50%)' }}>
                  {abCreationState === 'waiting_for_b' ? 'B' : 'A'}
                </span>
              </div>
              <span className="hidden sm:absolute sm:-bottom-8 sm:left-1/2 sm:transform sm:-translate-x-1/2 text-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {abCreationState === 'waiting_for_b' ? 'SET B POINT' : 'SET A POINT'}
              </span>
            </button>
          </div>
        </div>

        {/* Volume Control with Neon */}
        <div className="flex items-center gap-3 w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
          <button onClick={toggleMute} className="p-2 hover:bg-zinc-800/50 rounded-full transition-colors group relative">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-neon-cyan" />
            ) : volume < 0.5 ? (
              <Volume className="w-5 h-5 text-neon-cyan" />
            ) : (
              <Volume className="w-5 h-5 text-neon-cyan" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
          />
        </div>

        {/* Speed Control */}
        <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neon-cyan tracking-wide">PLAYBACK SPEED</span>
            <button
              onClick={resetSpeed}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-neon-purple font-mono"
            >
              RESET
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-4 py-2 text-sm rounded-lg transition-all font-mono ${
                  playbackSpeed === speed
                    ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/50'
                    : 'bg-zinc-800/50 text-neon-cyan hover:bg-zinc-700/50'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neon-purple font-mono w-12">
              {playbackSpeed.toFixed(2)}x
            </span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.01"
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-neon-pink"
            />
          </div>
        </div>
        </div>

        {/* Playlist Section */}
        {tracks.length > 0 && (
          <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
            <h3 className="text-sm font-medium text-neon-cyan mb-2 sm:mb-3 tracking-wide">
              PLAYLIST ({tracks.length} {tracks.length === 1 ? 'TRACK' : 'TRACKS'})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tracks.map((track, index) => (
                <SwipeableItem
                  key={track.id}
                  actions={
                    <div className="w-full h-full flex">
                      <div className="flex-1 bg-neon-purple/90 dark:bg-neon-blue/90 flex items-center justify-center">
                        <button
                          onClick={() => startRenamingTrack(track)}
                          className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                          aria-label="Edit track name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 bg-red-500/90 dark:bg-red-600/90 flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteTrack(track.id, track.src)}
                          className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                          aria-label="Delete track"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  }
                  onSwipeLeft={() => handleDeleteTrack(track.id, track.src)}
                  threshold={30}
                >
                  <div
                    onClick={() => {
                      setCurrentTrackIndex(index);
                      setCurrentTime(0);
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all group cursor-pointer h-full ${
                      index === currentTrackIndex
                        ? 'bg-neon-purple/20 border border-neon-purple/50 neon-glow-pink'
                        : 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent group-hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`text-xs font-mono w-6 flex-shrink-0 ${
                        index === currentTrackIndex ? 'text-neon-cyan' : 'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-sm font-medium truncate ${
                          index === currentTrackIndex ? 'text-neon-cyan' : 'text-zinc-200 dark:text-zinc-100'
                        }`}>
                          {track.title}
                        </span>
                      </div>
                    </div>
                    {/* Desktop actions - edit and delete */}
                    <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenamingTrack(track);
                        }}
                        className="p-2 text-zinc-400 hover:text-neon-cyan rounded transition-all"
                        aria-label="Edit track name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrack(track.id, track.src);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 rounded transition-all"
                        aria-label="Delete track"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SwipeableItem>
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
          onEditLoopClick={handleEditABLoopClick}
          onDeleteLoop={handleDeleteABLoop}
          onEditLoop={handleEditABLoop}
          onExportLoop={handleExportLoop}
          onExportAllLoops={handleExportAllLoops}
          isLoopExporting={isLoopExporting}
        />

        {/* Bookmarks Section */}
        <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
          <h3 className="text-sm font-medium text-neon-cyan mb-2 sm:mb-3 tracking-wide">
            BOOKMARKS ({bookmarks.length})
          </h3>
          {bookmarks.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookmarks.map((bookmark) => (
                <SwipeableItem
                  key={bookmark.id}
                  actions={
                    <div className="w-full h-full flex">
                      <div className="flex-1 bg-yellow-500/90 dark:bg-yellow-600/90 flex items-center justify-center">
                        <button
                          onClick={() => handleEditBookmarkClick(bookmark.id, bookmark.name, bookmark.timestamp)}
                          className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                          aria-label="Edit bookmark"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 bg-red-500/90 dark:bg-red-600/90 flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteBookmark(bookmark.id)}
                          className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                          aria-label="Delete bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  }
                  onSwipeLeft={() => handleDeleteBookmark(bookmark.id)}
                  threshold={30}
                >
                  <div
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-all group h-full border border-transparent group-hover:border-zinc-600"
                  >
                    <button
                      onClick={() => handleJumpToBookmark(bookmark.timestamp)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1"
                    >
                      <Bookmark className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-zinc-200 dark:text-zinc-100 truncate">
                          {bookmark.name}
                        </span>
                        <span className="text-xs text-neon-purple font-mono">
                          {formatTime(bookmark.timestamp)}
                        </span>
                      </div>
                    </button>
                    {/* Desktop hover actions - hidden by default */}
                    <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEditBookmarkClick(bookmark.id, bookmark.name, bookmark.timestamp)}
                        className="p-2 rounded bg-zinc-700 dark:bg-zinc-600 text-zinc-300 hover:bg-zinc-600 dark:hover:bg-zinc-500 transition-colors"
                        aria-label="Edit bookmark"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="p-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        aria-label="Delete bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SwipeableItem>
              ))}
            </div>
          )}

          {bookmarks.length === 0 && currentTrack && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              NO BOOKMARKS YET. CLICK THE BOOKMARK ICON IN THE CONTROLS TO ADD ONE.
            </p>
          )}
        </div>

        {/* Upload Section */}
        <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
          <h3 className="text-sm font-medium text-neon-cyan mb-2 sm:mb-3 tracking-wide">
            UPLOAD YOUR OWN AUDIO
          </h3>
          <AudioUploader
            onUploadComplete={handleUploadComplete}
            activeConfigurationId={activeConfigurationId || configurations[0]?.id || ''}
          />
        </div>

        {/* Configuration Section */}
        <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
          <button
            onClick={() => setIsConfigSectionOpen(!isConfigSectionOpen)}
            className="flex items-center justify-between w-full text-sm font-medium text-neon-cyan hover:text-neon-purple transition-colors"
          >
            <span className="tracking-wide">CONFIGURATION</span>
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${
                isConfigSectionOpen ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {isConfigSectionOpen && (
            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              {/* Configuration List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-neon-purple font-mono">ACTIVE CONFIGURATION</span>
                  <button
                    onClick={() => handleCreateConfiguration(prompt("Enter configuration name:") || "")}
                    className="flex items-center gap-1 px-2 py-1 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan text-xs rounded border border-neon-cyan/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    NEW
                  </button>
                </div>

                {configurations.length === 0 ? (
                  <div className="text-center py-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    NO CONFIGURATIONS YET. CREATE ONE TO GET STARTED!
                  </div>
                ) : (
                  configurations.map((config) => (
                    <div
                      key={config.id}
                      className={`p-2 border rounded-lg transition-all ${
                        activeConfigurationId === config.id
                          ? "border-neon-pink bg-neon-pink/10 neon-glow-pink"
                          : "border-zinc-700 dark:border-zinc-600 hover:border-neon-purple/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isRenaming === config.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={renamingName}
                                onChange={(e) => setRenamingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename();
                                  if (e.key === "Escape") cancelRename();
                                }}
                                className="flex-1 px-2 py-1 border border-neon-cyan rounded text-xs bg-zinc-800/50 text-neon-cyan font-mono"
                              />
                              <button
                                onClick={saveRename}
                                className="p-1 hover:bg-neon-cyan/20 rounded transition-colors"
                              >
                                <CheckCircle className="w-3 h-3 text-neon-cyan" />
                              </button>
                              <button
                                onClick={cancelRename}
                                className="p-1 hover:bg-zinc-700 rounded transition-colors"
                              >
                                <X className="w-3 h-3 text-zinc-400" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConfigurationChange(config.id)}
                              className="flex-1 text-left"
                            >
                              <div className={`text-xs font-medium truncate ${
                                activeConfigurationId === config.id ? 'text-neon-cyan' : 'text-zinc-300'
                              }`}>{config.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono truncate">{config.id}</div>
                            </button>
                          )}
                          {activeConfigurationId === config.id && isRenaming !== config.id && (
                            <CheckCircle className="w-3 h-3 text-neon-cyan flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startRenaming(config)}
                            className="p-1 hover:bg-zinc-700 rounded transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3 text-neon-cyan" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfiguration(config.id)}
                            className="p-1 hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                          <button
                            onClick={() => handleExportConfig(config.id, config.name)}
                            disabled={isExporting}
                            className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 transition-colors"
                            title="Export"
                          >
                            {isExporting ? (
                              <Loader2 className="w-3 h-3 animate-spin text-neon-pink" />
                            ) : (
                              <Download className="w-3 h-3 text-neon-cyan" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Export Active Configuration */}
              <button
                onClick={handleExport}
                disabled={isExporting || tracks.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-cyan border border-neon-pink/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group neon-border-pink"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>EXPORTING...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 group-hover:animate-pulse" />
                    <span>DOWNLOAD ALL CONFIGURATIONS</span>
                  </>
                )}
              </button>

              {/* Import */}
              <input
                type="file"
                accept=".zip"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                id="import-config"
              />
              <label
                htmlFor="import-config"
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 border-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isImporting
                    ? 'border-zinc-600 bg-zinc-800/50'
                    : 'border-zinc-700 hover:border-neon-cyan bg-transparent'
                } rounded-lg`}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neon-pink" />
                    <span className="font-mono">IMPORTING...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-neon-cyan" />
                    <span className="font-mono">IMPORT CONFIGURATION</span>
                  </>
                )}
              </label>

              {importMessage && (
                <p className={`text-sm font-mono ${
                  importMessage.error ? 'text-red-400' : 'text-neon-cyan'
                }`}>
                  {importMessage.text}
                </p>
              )}

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>RESET EVERYTHING</span>
              </button>
            </div>
          )}
        </div>
        </main>
      )}

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        onSave={handleSaveBookmark}
        bookmarkTimestamp={bookmarkTimestamp}
      />

      {/* Edit Bookmark Modal */}
      <EditBookmarkModal
        isOpen={isEditBookmarkModalOpen}
        onClose={() => {
          setIsEditBookmarkModalOpen(false);
          setEditingBookmarkId(null);
        }}
        onSave={handleSaveEditBookmark}
        bookmarkName={editingBookmarkName}
        bookmarkTimestamp={editingBookmarkTimestamp}
      />

      {/* AB Loop Modal */}
      <ABLoopModal
        isOpen={isABLoopModalOpen}
        onClose={() => setIsABLoopModalOpen(false)}
        onSave={handleSaveABLoop}
        initialName={`Loop from ${formatTime(pendingAPoint)} to ${formatTime(currentTime)}`}
      />

      {/* Edit AB Loop Modal */}
      <EditABLoopModal
        isOpen={isEditABLoopModalOpen}
        onClose={() => {
          setIsEditABLoopModalOpen(false);
          setEditingLoopId(null);
        }}
        onSave={handleSaveEditABLoop}
        loopName={editingABLoopName}
        aPoint={editingABLoopA}
        bPoint={editingABLoopB}
      />

      {/* Rename Track Modal */}
      <RenameTrackModal
        isOpen={isRenameModalOpen}
        onClose={handleCancelTrackRename}
        onSave={handleSaveTrackRename}
        trackName={renamingTrackTitle}
      />
    </div>
  );
}
