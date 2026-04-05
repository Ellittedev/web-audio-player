"use client";

import { useState, useEffect } from "react";

interface EditABLoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, aPoint: number, bPoint: number) => void;
  loopName: string;
  aPoint: number;
  bPoint: number;
}

export default function EditABLoopModal({
  isOpen,
  onClose,
  onSave,
  loopName,
  aPoint,
  bPoint,
}: EditABLoopModalProps) {
  const [name, setName] = useState("");
  const [aTimestamp, setATimestamp] = useState(0);
  const [bTimestamp, setBTimestamp] = useState(0);
  const [displayATimestamp, setDisplayATimestamp] = useState("");
  const [displayBTimestamp, setDisplayBTimestamp] = useState("");

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
    setDisplayATimestamp(formatTime(aTimestamp));
  }, [aTimestamp]);

  useEffect(() => {
    setDisplayBTimestamp(formatTime(bTimestamp));
  }, [bTimestamp]);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(loopName);
      setATimestamp(aPoint);
      setBTimestamp(bPoint);
    }
  }, [isOpen, loopName, aPoint, bPoint]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && bTimestamp > aTimestamp) {
      onSave(name.trim(), aTimestamp, bTimestamp);
      onClose();
    } else if (bTimestamp <= aTimestamp) {
      alert("B point must be after A point.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a0a2e] border border-neon-cyan/50 rounded-lg p-6 w-full max-w-[90%] sm:max-w-sm mx-auto shadow-xl neon-glow-cyan relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan"></div>
        
        <h3 className="text-lg font-semibold text-neon-cyan mb-4 tracking-wide">
          EDIT LOOP
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neon-purple mb-2">
              LOOP NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER LOOP NAME..."
              className="w-full px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan font-mono"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neon-purple mb-2">
              LOOP RANGE
            </label>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button
                    type="button"
                    onClick={() => setATimestamp(Math.max(0, aTimestamp - 1))}
                    className="w-14 h-14 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                    aria-label="Decrease A point by 1 second"
                  >
                    <span className="text-2xl">-</span>
                  </button>
                  <input
                    type="text"
                    value={displayATimestamp}
                    onChange={(e) => setATimestamp(parseTime(e.target.value))}
                    step="0.1"
                    min="0"
                    className="w-24 px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-pink font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setATimestamp(aTimestamp + 1)}
                    className="w-14 h-14 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                    aria-label="Increase A point by 1 second"
                  >
                    <span className="text-2xl">+</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono text-center">
                  A POINT (CURRENT: {formatTime(aTimestamp)} | ORIGINAL: {formatTime(aPoint)})
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button
                    type="button"
                    onClick={() => setBTimestamp(Math.max(0, bTimestamp - 1))}
                    className="w-14 h-14 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                    aria-label="Decrease B point by 1 second"
                  >
                    <span className="text-2xl">-</span>
                  </button>
                  <input
                    type="text"
                    value={displayBTimestamp}
                    onChange={(e) => setBTimestamp(parseTime(e.target.value))}
                    step="0.1"
                    min="0"
                    className="w-24 px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-pink font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setBTimestamp(bTimestamp + 1)}
                    className="w-14 h-14 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-zinc-600/50 text-neon-cyan transition-colors"
                    aria-label="Increase B point by 1 second"
                  >
                    <span className="text-2xl">+</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono text-center">
                  B POINT (CURRENT: {formatTime(bTimestamp)} | ORIGINAL: {formatTime(bPoint)})
                </p>
              </div>
            </div>
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
              disabled={!name.trim() || bTimestamp <= aTimestamp}
              className="px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
