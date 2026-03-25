"use client";

import { useState, useCallback } from "react";
import { Play, Pause, Edit2, Trash2 } from "lucide-react";

interface ABLoop {
  id: string;
  name: string;
  aPoint: number;
  bPoint: number;
  createdAt: number;
}

interface ABRepeatControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onToggleLoop: (loopId: string | null) => void;
  activeLoopId: string | null;
  loops: ABLoop[];
  onStartABCreation: (currentTime: number, pointType: 'A' | 'B') => void;
  abCreationState: 'idle' | 'waiting_for_b';
  onDeleteLoop: (loopId: string) => void;
  onEditLoop: (loopId: string, aPoint: number, bPoint: number) => void;
}

export default function ABRepeatControls({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onToggleLoop,
  activeLoopId,
  loops,
  onStartABCreation,
  abCreationState,
  onDeleteLoop,
  onEditLoop,
}: ABRepeatControlsProps) {
  const [showLoopsList, setShowLoopsList] = useState(false);

  const handleSeekToA = useCallback((aPoint: number) => {
    onSeek(aPoint);
  }, [onSeek]);

  const handleSeekToB = useCallback((bPoint: number) => {
    onSeek(bPoint);
  }, [onSeek]);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Dynamic button for creating A/B loops
  const renderCreateButton = () => {
    if (abCreationState === 'waiting_for_b') {
      return (
        <button
          onClick={() => onStartABCreation(currentTime, 'B')}
          disabled={duration === 0}
          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-500"
          aria-label="Set B point to complete loop"
        >
          <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">SET B</div>
          <div className="text-lg font-mono text-blue-900 dark:text-blue-300">
            {formatTime(currentTime)}
          </div>
        </button>
      );
    }

    // Default state - waiting for A point
    return (
      <button
        onClick={() => onStartABCreation(currentTime, 'A')}
        disabled={duration ? (duration === 0) : false}
        className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-500"
        aria-label="Set A point to start loop creation"
      >
        <div className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">SET A</div>
        <div className="text-lg font-mono text-green-900 dark:text-green-300">
          {formatTime(currentTime)}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* AB Repeat Controls Header */}
      <div className="flex items-center gap-3 mb-3">
        {renderCreateButton()}
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">AB Repeat Loops</span>
      </div>

      {/* Active Loop Indicator */}
      {activeLoopId && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-300 dark:border-purple-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">Active Loop</span>
            <button
              onClick={() => onToggleLoop(null)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              Stop
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {loops.find((l) => l.id === activeLoopId)?.name}
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      )}

      {/* Loops List */}
      {loops.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {loops.map((loop) => (
            <div
              key={loop.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${
                activeLoopId === loop.id
                  ? "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-300 dark:border-purple-700"
                  : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => handleSeekToA(loop.aPoint)}
                  className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold transition-colors ${
                    activeLoopId === loop.id
                      ? "bg-green-600 text-white"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  }`}
                  title="Seek to A point"
                >
                  A
                </button>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-medium truncate ${
                    activeLoopId === loop.id ? "text-purple-900 dark:text-purple-100" : "text-zinc-900 dark:text-zinc-100"
                  }`}>
                    {loop.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatTime(loop.aPoint)} → {formatTime(loop.bPoint)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onToggleLoop(activeLoopId === loop.id ? null : loop.id)}
                  className={`p-2 rounded transition-colors ${
                    activeLoopId === loop.id
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  }`}
                  title={activeLoopId === loop.id ? "Stop this loop" : "Play this loop"}
                >
                  {activeLoopId === loop.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => onEditLoop(loop.id, loop.aPoint, loop.bPoint)}
                  className="p-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  title="Edit loop"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteLoop(loop.id)}
                  className="p-2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete loop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loops.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No loops yet. Click the button to create your first AB repeat loop.
        </p>
      )}
    </div>
  );
}
