"use client";

import { useState, useEffect } from "react";

interface EditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, timestamp: number) => void;
  bookmarkName: string;
  bookmarkTimestamp: number;
}

export default function EditBookmarkModal({
  isOpen,
  onClose,
  onSave,
  bookmarkName,
  bookmarkTimestamp,
}: EditBookmarkModalProps) {
  const [name, setName] = useState("");
  const [timestamp, setTimestamp] = useState(0);
  const [displayTimestamp, setDisplayTimestamp] = useState("");

  // Format time helper
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Parse formatted time back to seconds (e.g., "2:03" -> 123)
  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(":");
    if (parts.length !== 2) return 0;
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return minutes * 60 + seconds;
  };

  // Keep display in sync with timestamp changes
  useEffect(() => {
    setDisplayTimestamp(formatTime(timestamp));
  }, [timestamp]);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(bookmarkName);
      setTimestamp(bookmarkTimestamp);
      setDisplayTimestamp(formatTime(bookmarkTimestamp));
    }
  }, [isOpen, bookmarkName, bookmarkTimestamp]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), timestamp);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a0a2e] border border-neon-pink/50 rounded-lg p-6 w-full max-w-[90%] sm:max-w-sm mx-auto shadow-xl neon-glow-pink relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-pink"></div>
        
        <h3 className="text-lg font-semibold text-neon-cyan mb-4 tracking-wide">
          EDIT BOOKMARK
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neon-purple mb-2">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER BOOKMARK NAME..."
              className="w-full px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-pink font-mono"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neon-purple mb-2">
              TIMESTAMP
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTimestamp(Math.max(0, timestamp - 1))}
                className="w-16 h-16 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                aria-label="Decrease timestamp by 1 second"
              >
                <span className="text-2xl">-</span>
              </button>
              <input
                type="text"
                value={displayTimestamp}
                onChange={(e) => setTimestamp(parseTime(e.target.value))}
                step="0.1"
                min="0"
                className="w-24 px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-pink font-mono text-center"
              />
              <button
                type="button"
                onClick={() => setTimestamp(timestamp + 1)}
                className="w-16 h-16 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                aria-label="Increase timestamp by 1 second"
              >
                <span className="text-2xl">+</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono text-center">
              CURRENT: {formatTime(timestamp)} | ORIGINAL: {formatTime(bookmarkTimestamp)}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-neon-cyan hover:bg-zinc-700/50 rounded-lg transition-colors font-mono"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-neon-pink text-white rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
