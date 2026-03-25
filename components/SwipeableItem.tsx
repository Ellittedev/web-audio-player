"use client";

import { useState, useRef, ReactNode } from "react";

interface SwipeableItemProps {
  children: ReactNode;
  actions: ReactNode;
  onSwipeLeft?: () => void;
  threshold?: number;
  disabled?: boolean;
}

export default function SwipeableItem({
  children,
  actions,
  onSwipeLeft,
  threshold = 50,
  disabled = false,
}: SwipeableItemProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

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
      setTranslateX(Math.min(diff, maxSwipe));
    } else {
      setTranslateX(0);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || disabled) return;

    // Calculate distance based on the actual translateX value
    const distance = translateX;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      setIsSwiped(true);
      setTranslateX(maxSwipe);
    } else {
      // Reset position
      setTranslateX(0);
    }

    setTouchStart(null);
  };

  const handleReset = () => {
    setTranslateX(0);
    setIsSwiped(false);
  };

  return (
    <div className="relative overflow-hidden" style={{ height: '100%' }}>
      {/* Action buttons container - hidden off-screen to the right by default */}
      <div
        className="absolute top-0 bottom-0 flex items-center gap-1 px-2 bg-red-500/90 dark:bg-red-600/90"
        style={{
          left: 'calc(100% - 1px)',
          width: `${maxSwipe}px`,
          height: '100%',
          transform: isSwiped ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-out',
          zIndex: 1,
        }}
      >
        {actions}
      </div>

      {/* Main content - slides over actions */}
      <div
        ref={itemRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseLeave={handleReset}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiped ? 'transform 0.3s ease-out' : 'none',
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
