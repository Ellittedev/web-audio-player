"use client";

import { useState, useRef, ReactNode } from "react";

interface SwipeableItemProps {
  children: ReactNode;
  actions: ReactNode;
  onSwipeLeft?: () => void;
  threshold?: number;
  disabled?: boolean;
  backgroundColors?: string[]; // Array of colors for each action button, or single color for all
}

export default function SwipeableItem({
  children,
  actions,
  onSwipeLeft,
  threshold = 50,
  disabled = false,
  backgroundColors,
}: SwipeableItemProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 1

  const minSwipeDistance = threshold;
  const maxSwipe = 150;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || disabled) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    // Only allow left swipe (positive diff means moving left)
    if (diff > 0) {
      setSwipeProgress(Math.min(diff / maxSwipe, 1));
    } else {
      setSwipeProgress(0);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || disabled) return;

    // Calculate distance based on the actual swipe progress
    const distance = swipeProgress * maxSwipe;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      setSwipeProgress(1);
    } else {
      setSwipeProgress(0);
    }

    setTouchStart(null);
  };

  const handleReset = () => {
    setSwipeProgress(0);
  };

  return (
    <div className="relative overflow-hidden" style={{ height: '100%' }}>
      {/* Action buttons container - hidden off-screen to the right by default */}
      <div
        className="absolute top-0 bottom-0 flex items-center gap-0 px-0"
        style={{
          left: '100%',
          width: `${maxSwipe}px`,
          height: '100%',
          transform: `translateX(${swipeProgress * -maxSwipe}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: 1,
        }}
      >
        {actions}
      </div>

      {/* Main content - stays in place */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseLeave={handleReset}
        style={{
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          zIndex: 2,
        }}
      >
        {children}
      </div>
    </div>
  );
}
