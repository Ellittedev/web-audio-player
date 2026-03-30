"use client";

import { useState, useCallback, useEffect } from "react";

interface ABLoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, aPoint: number, bPoint: number) => void;
  initialName: string;
}

export default function ABLoopModal({
  isOpen,
  onClose,
  onSave,
  initialName,
}: ABLoopModalProps) {
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (isOpen) {
      setName(initialName ?? "");
    }
  }, [isOpen, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), 0, 0); // Points are set by the parent button flow
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a0a2e] border border-neon-cyan/50 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl neon-glow-cyan relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink"></div>
        
        <h3 className="text-lg font-semibold text-neon-cyan mb-4 tracking-wide">
          NAME YOUR LOOP
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-neon-purple mb-2">
              LOOP NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER LOOP NAME..."
              className="w-full px-4 py-2 border border-zinc-600 rounded-lg bg-zinc-800/50 text-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan mb-2 font-mono"
              autoFocus
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              THIS LOOP WILL PLAY REPEATEDLY FROM YOUR SELECTED A AND B POINTS
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
              className="px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              CREATE LOOP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
