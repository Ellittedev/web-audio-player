"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import { storeAudio, type StoredAudio } from "@/lib/storage";

interface AudioFile {
  name: string;
  url: string;
  id: string;
}

interface AudioUploaderProps {
  onUploadComplete: (audioFile: AudioFile) => void;
}

export default function AudioUploader({ onUploadComplete }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track blob URLs to revoke them later
  const blobUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      // Clean up all blob URLs when component unmounts
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Please upload an audio file (MP3, WAV, OGG).");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large. Max size is 50MB.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const id = crypto.randomUUID();

      // Convert file to base64 for storage
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const dataUrl = await dataUrlPromise;

      // Store in IndexedDB for persistence across page reloads
      const storedAudio: StoredAudio = {
        id,
        name: file.name,
        dataUrl,
        size: file.size,
        type: file.type,
      };
      await storeAudio(storedAudio);

      // Create blob URL from the data URL for playback
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      blobUrls.current.add(url);

      onUploadComplete({
        id,
        name: file.name,
        url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setProcessing(false);
    }
  }, [onUploadComplete]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
          }
          ${processing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={processing}
        />

        {processing ? (
          <div className="text-zinc-600 dark:text-zinc-400">
            <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Processing...</p>
          </div>
        ) : (
          <>
            <UploadCloud className="w-12 h-12 mx-auto mb-3 text-zinc-400 dark:text-zinc-500" />
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">
              Drop audio file here or click to browse
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              MP3, WAV, OGG (max 50MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
