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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Edit Loop
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Loop Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter loop name..."
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Loop Range
            </label>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setATimestamp(Math.max(0, aTimestamp - 1))}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Decrease A point by 1 second"
                  >
                    <span className="text-lg">-</span>
                  </button>
                  <input
                    type="text"
                    value={displayATimestamp}
                    onChange={(e) => setATimestamp(parseTime(e.target.value))}
                    step="0.1"
                    min="0"
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setATimestamp(aTimestamp + 1)}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Increase A point by 1 second"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  A Point (current: {formatTime(aTimestamp)} | original: {formatTime(aPoint)})
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBTimestamp(Math.max(0, bTimestamp - 1))}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Decrease B point by 1 second"
                  >
                    <span className="text-lg">-</span>
                  </button>
                  <input
                    type="text"
                    value={displayBTimestamp}
                    onChange={(e) => setBTimestamp(parseTime(e.target.value))}
                    step="0.1"
                    min="0"
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setBTimestamp(bTimestamp + 1)}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Increase B point by 1 second"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  B Point (current: {formatTime(bTimestamp)} | original: {formatTime(bPoint)})
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || bTimestamp <= aTimestamp}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
