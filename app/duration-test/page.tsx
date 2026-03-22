"use client";

import { useEffect, useRef } from "react";

export default function DurationTest() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    console.log('=== DURATION TEST PAGE LOADED ===');
    
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found!');
      return;
    }

    // Check if src is loaded
    console.log('Audio src:', audio.src);
    console.log('Ready state:', audio.readyState);

    // Set up error handling first
    audio.addEventListener('error', (e) => {
      console.error('=== AUDIO ERROR ===');
      const audioElement = e.target as HTMLAudioElement;
      if (audioElement.error) {
        console.error('Error code:', audioElement.error.code);
        console.error('Error message:', audioElement.error.message);
      }
    });

    // Set up loadedmetadata
    audio.addEventListener('loadedmetadata', () => {
      console.log('=== AUDIO METADATA LOADED ===');
      console.log('Duration:', audio.duration, 'seconds');
      console.log('Duration (formatted):',
        Math.floor(audio.duration / 60) + ':' +
        Math.floor(audio.duration % 60).toString().padStart(2, '0'));
      
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        console.error('INVALID DURATION! Duration is:', audio.duration);
      }
    });

    // Also try to load the audio immediately
    console.log('Loading audio...');
    audio.load();

  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-8">
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-4">Audio Duration Test</h1>
        <p className="mb-4 text-zinc-400">Open browser console (F12) to see the logged duration.</p>

        <audio
          ref={audioRef}
          src="/audio/sample1.mp3"
          controls
        />

        <div className="mt-4 p-4 bg-zinc-800 rounded">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-300">
            <li>Open browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Look for "=== AUDIO METADATA LOADED ===" message</li>
            <li>If you see errors, check the Network tab for failed requests</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
