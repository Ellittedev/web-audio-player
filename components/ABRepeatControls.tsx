"use client";

import { useState, useCallback } from "react";
import { Play, Pause, Edit2, Trash2, FileDown, Download } from "lucide-react";
import SwipeableItem from "./SwipeableItem";

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
  onEditLoopClick: (loopId: string, name: string, aPoint: number, bPoint: number) => void;
  onDeleteLoop: (loopId: string) => void;
  onEditLoop: (loopId: string, aPoint: number, bPoint: number) => void;
  onExportLoop?: (loopId: string, name: string, aPoint: number, bPoint: number) => void;
  onExportAllLoops?: () => void;
  isLoopExporting?: boolean;
}

export default function ABRepeatControls({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onToggleLoop,
  activeLoopId,
  loops,
  onEditLoopClick,
  onDeleteLoop,
  onEditLoop,
  onExportLoop,
  onExportAllLoops,
  isLoopExporting = false,
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

  return (
    <div className="w-full mt-4 sm:mt-6 pt-4 border-t border-zinc-700/50">
      {/* AB Repeat Controls Header */}
      <div className="flex items-center gap-3 mb-2 sm:mb-3">
        <span className="text-sm font-medium text-neon-cyan tracking-wide">AB REPEAT LOOPS</span>
      </div>

      {/* Active Loop Indicator */}
      {activeLoopId && (
        <div className="mb-3 p-3 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-neon-pink/50 rounded-lg neon-glow-pink">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neon-pink uppercase tracking-wider">ACTIVE LOOP</span>
            <button
              onClick={() => onToggleLoop(null)}
              className="text-xs text-neon-cyan hover:underline font-mono"
            >
              STOP
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neon-cyan truncate">
              {loops.find((l) => l.id === activeLoopId)?.name}
            </span>
            <span className="text-xs text-neon-purple font-mono">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      )}

      {/* Loops List */}
      {loops.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {/* Export All Loops Button */}
          {onExportAllLoops && (
            <button
              onClick={onExportAllLoops}
              disabled={isLoopExporting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-neon-cyan bg-zinc-800/50 hover:bg-zinc-700/50 border border-neon-pink/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group neon-border-pink"
            >
              {isLoopExporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono">EXPORTING...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 group-hover:animate-pulse" />
                  <span className="font-mono">EXPORT ALL LOOPS AS ZIP</span>
                </>
              )}
            </button>
          )}

          {loops.map((loop) => (
            <SwipeableItem
              key={loop.id}
              actions={
                <div className="w-full h-full flex">
                  {onExportLoop && (
                    <div className="flex-1 bg-neon-purple/90 flex items-center justify-center neon-border-pink">
                      <button
                        onClick={() => onExportLoop(loop.id, loop.name, loop.aPoint, loop.bPoint)}
                        disabled={isLoopExporting}
                        className="p-2 rounded text-white hover:bg-opacity-80 transition-colors disabled:opacity-50"
                        title="Export as MP3"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 bg-neon-cyan/90 flex items-center justify-center neon-border-pink">
                    <button
                      onClick={() => onToggleLoop(activeLoopId === loop.id ? null : loop.id)}
                      className="p-2 rounded text-black hover:bg-opacity-80 transition-colors"
                      title={activeLoopId === loop.id ? "Stop this loop" : "Play this loop"}
                    >
                      {activeLoopId === loop.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 bg-yellow-500/90 flex items-center justify-center neon-border-pink">
                    <button
                      onClick={() => onEditLoopClick(loop.id, loop.name, loop.aPoint, loop.bPoint)}
                      className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                      title="Edit loop"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 bg-red-500/90 flex items-center justify-center neon-border-pink">
                    <button
                      onClick={() => onDeleteLoop(loop.id)}
                      className="p-2 rounded text-white hover:bg-opacity-80 transition-colors"
                      title="Delete loop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              }
              onSwipeLeft={() => onEditLoopClick(loop.id, loop.name, loop.aPoint, loop.bPoint)}
              threshold={30}
            >
              <div
                className={`flex items-center justify-between p-3 rounded-lg transition-all group h-full ${
                  activeLoopId === loop.id
                    ? "bg-neon-purple/20 border border-neon-pink/50 neon-glow-pink"
                    : "bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent group-hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleSeekToA(loop.aPoint)}
                    className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold transition-colors ${
                      activeLoopId === loop.id
                        ? "bg-neon-cyan text-black"
                        : "bg-zinc-700/50 text-neon-cyan hover:bg-zinc-600/50"
                    }`}
                    title="Seek to A point"
                  >
                    A
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${
                      activeLoopId === loop.id ? "text-neon-cyan" : "text-zinc-200 dark:text-zinc-100"
                    }`}>
                      {loop.name}
                    </span>
                    <span className="text-xs text-neon-purple font-mono">
                      {formatTime(loop.aPoint)} → {formatTime(loop.bPoint)}
                    </span>
                  </div>
                </div>

                {/* Desktop hover actions */}
                <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                  {onExportLoop && (
                    <button
                      onClick={() => onExportLoop(loop.id, loop.name, loop.aPoint, loop.bPoint)}
                      disabled={isLoopExporting}
                      className="p-2 rounded bg-zinc-700 dark:bg-zinc-600 text-neon-cyan hover:bg-zinc-600 dark:hover:bg-zinc-500 transition-colors disabled:opacity-50"
                      title="Export as MP3"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleLoop(activeLoopId === loop.id ? null : loop.id)}
                    className={`p-2 rounded transition-colors ${
                      activeLoopId === loop.id
                        ? "bg-neon-cyan text-black hover:bg-opacity-80"
                        : "bg-zinc-700 dark:bg-zinc-600 text-neon-cyan hover:bg-zinc-600 dark:hover:bg-zinc-500"
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
                    onClick={() => onEditLoopClick(loop.id, loop.name, loop.aPoint, loop.bPoint)}
                    className="p-2 rounded bg-zinc-700 dark:bg-zinc-600 text-neon-cyan hover:bg-zinc-600 dark:hover:bg-zinc-500 transition-colors"
                    title="Edit loop"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteLoop(loop.id)}
                    className="p-2 rounded bg-zinc-700 dark:bg-zinc-600 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                    title="Delete loop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </SwipeableItem>
          ))}
        </div>
      )}

      {loops.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
          NO LOOPS YET. CLICK THE BUTTON TO CREATE YOUR FIRST AB REPEAT LOOP.
        </p>
      )}
    </div>
  );
}
