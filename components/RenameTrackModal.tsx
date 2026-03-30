"use client";

import { useState, useEffect } from "react";

interface RenameTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  trackName: string;
}

export default function RenameTrackModal({
  isOpen,
  onClose,
  onSave,
  trackName,
}: RenameTrackModalProps) {
  const [name, setName] = useState("");

  // Initialize name when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(trackName);
    }
  }, [isOpen, trackName]);

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
      <div className="bg-[#1a0a2e] border border-neon-cyan/50 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl neon-glow-cyan relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan"></div>
        
        <h3 className="text-lg font-semibold text-neon-cyan mb-4 tracking-wide">
          RENAME TRACK
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ENTER TRACK NAME..."
            className="w-full px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan mb-4 font-mono"
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
              className="px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              SAVE RENAME
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
