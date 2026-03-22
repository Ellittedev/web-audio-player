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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Name Your Loop
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Loop Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter loop name..."
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 mb-2"
              autoFocus
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This loop will play repeatedly from your selected A and B points
            </p>
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
              disabled={!name.trim()}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Loop
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
