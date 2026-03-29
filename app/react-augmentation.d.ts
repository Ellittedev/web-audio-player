// Type augmentation for React HTML attributes
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    playbackRate?: number;
  }
}
