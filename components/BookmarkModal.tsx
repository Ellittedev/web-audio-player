"use client";

import { useState, useEffect } from "react";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  bookmarkTimestamp?: number;
}

export default function BookmarkModal({ isOpen, onClose, onSave, bookmarkTimestamp }: BookmarkModalProps) {
  const [name, setName] = useState("");

  // Generate unique timestamp-based name when modal opens
  useEffect(() => {
    if (isOpen && bookmarkTimestamp !== undefined) {
      const minutes = Math.floor(bookmarkTimestamp / 60);
      const seconds = Math.floor(bookmarkTimestamp % 60);
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      setName(`Bookmark at ${formattedTime}`);
    }
  }, [isOpen, bookmarkTimestamp]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a0a2e] border border-neon-pink/50 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl neon-glow-pink relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan"></div>
        
        <h3 className="text-lg font-semibold text-neon-cyan mb-4 tracking-wide">
          NAME BOOKMARK
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ENTER BOOKMARK NAME..."
            className="w-full px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-pink mb-4 font-mono"
            autoFocus
          />
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
              SAVE BOOKMARK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
