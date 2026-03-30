"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { storeAudio, type StoredAudio } from "@/lib/storage";

interface AudioFile {
  name: string;
  url: string;
  id: string;
}

interface AudioUploaderProps {
  onUploadComplete: (audioFile: AudioFile) => void;
  activeConfigurationId: string;
}

export default function AudioUploader({ onUploadComplete, activeConfigurationId }: AudioUploaderProps) {
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
    // Validate file type - support various audio formats including WAV variants and AAC
    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/aac"
    ];

    // Also check file extension as fallback
    const validExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.mp4'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase() || '';
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => fileExtension === ext);

    if (!hasValidType && !hasValidExtension) {
      setError("Invalid file type. Please upload an audio file (MP3, WAV, OGG, WEBM, M4A, AAC).");
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large. Max size is 500MB.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const id = crypto.randomUUID();

      // Store blob directly in IndexedDB for large files (no base64 conversion)
      const storedAudio: StoredAudio = {
        id,
        name: file.name,
        blob: file,
        size: file.size,
        type: file.type,
        configurationId: activeConfigurationId,
        usesBlob: true, // Flag to indicate blob storage
      };
      await storeAudio(storedAudio);

      // Create blob URL directly from the uploaded file for playback
      const url = URL.createObjectURL(file);
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
  }, [onUploadComplete, activeConfigurationId]);

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
          border-2 rounded-lg p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden
          ${isDragging
            ? "border-neon-cyan bg-[#1a0a2e]/50"
            : "border-zinc-700 dark:border-zinc-600 hover:border-neon-pink"
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
          <div className="text-neon-cyan relative z-10">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin neon-glow-cyan" />
            <p className="font-mono text-sm tracking-wider">PROCESSING...</p>
          </div>
        ) : (
          <>
            <UploadCloud className={`w-12 h-12 mx-auto mb-3 transition-all ${
              isDragging ? "text-neon-cyan animate-pulse" : "text-zinc-500 dark:text-zinc-400 group-hover:text-neon-pink"
            }`} />
            <p className={`font-medium tracking-wide transition-colors ${
              isDragging ? "text-neon-cyan" : "text-zinc-300 dark:text-zinc-200"
            }`}>
              DROP AUDIO FILE HERE OR CLICK TO BROWSE
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              MP3, WAV, OGG, WEBM, M4A, AAC (MAX 500MB)
            </p>
          </>
        )}

        {/* Background gradient effect */}
        {!processing && (
          <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${
            isDragging ? "opacity-20" : ""
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/10 via-transparent to-neon-cyan/10"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg neon-border-pink">
          <p className="text-sm text-red-400 font-mono">{error}</p>
        </div>
      )}
    </div>
  );
}
