# Audio Player - Developer Reference

## Overview
A Next.js audio player application that allows users to upload and play their own audio files. Built with React 19, TypeScript, and Tailwind CSS v4.

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router)
- **React**: 19.2.4
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Build Tool**: Turbopack (via `next dev`)

## Key Dependencies
```json
{
  "uuid": "^13.0.0"  // For generating unique filenames
}
```

## Project Structure
```
audio-player/
├── app/
│   ├── page.tsx              # Main player component (client-side)
│   ├── api/upload/route.ts   # Upload API endpoint
│   └── uploads/[...filename]/route.ts  # Serve uploaded files
├── components/
│   └── AudioUploader.tsx     # Drag-and-drop upload component
├── public/audio/             # (Deprecated) Sample tracks - no longer used
└── uploads/                  # User-uploaded audio files stored here
```

## Core Features

### 1. Audio Playback
- Play/pause functionality
- Seek to any position in the track
- Volume control with mute toggle
- Track navigation (previous/next)
- Progress bar with time display
- Auto-play next track when current ends

### 2. File Upload
- Drag-and-drop interface
- Click to browse files
- Supports: MP3, WAV, OGG formats
- Maximum file size: 50MB
- Client and server-side validation
- UUID-based filename generation for uniqueness

## API Endpoints

### POST `/api/upload`
Uploads an audio file to the server.

**Request:**
- `multipart/form-data` with field `audio` containing the file

**Response (success):**
```json
{
  "success": true,
  "filename": "uuid.mp3",
  "url": "/uploads/uuid.mp3",
  "size": 1234567,
  "type": "audio/mpeg"
}
```

**Response (error):**
```json
{
  "error": "Error message"
}
```

### GET `/uploads/[...filename]`
Serves uploaded audio files.

## Data Models

### CustomTrack Interface
```typescript
interface CustomTrack {
  id: string;      // UUID filename
  title: string;   // Filename without extension
  src: string;     // Path to the file
  duration?: number;
}
```

### AudioFile Interface (for upload component)
```typescript
interface AudioFile {
  name: string;
  url: string;
  id: string;
}
```

## State Management

The main player (`app/page.tsx`) manages:
- `customTracks`: Array of uploaded tracks
- `currentTrackIndex`: Index of currently playing track (0-based)
- `isPlaying`: Play/pause state
- `currentTime`: Current playback position in seconds
- `duration`: Total track duration
- `volume`: Volume level (0.0 to 1.0)
- `isMuted`: Mute toggle state

## Key Behaviors

### Track Loading
When a track changes, the audio element is reloaded:
```typescript
useEffect(() => {
  if (audioRef.current && currentTrack) {
    audioRef.current.load();
    if (isPlaying) {
      audioRef.current.play().catch(/* handle error */);
    }
  }
}, [currentTrackIndex]);
```

### Metadata Loading
The component listens for `loadedmetadata` events to get track duration:
- Checks if metadata is already loaded on mount
- Auto-plays if player was in playing state when track loaded

### Empty State
When no tracks are uploaded:
- Shows "No track selected" message
- Player controls are disabled
- Audio element has no source

## File Storage

Uploaded files are stored in `/uploads/` directory:
- **Location**: `process.cwd() + '/uploads'`
- **Naming**: `{uuid}.{extension}` (e.g., `3ad4453f-b487-4eea-a2ad-c935f0fe195f.mp3`)
- **Directory Creation**: Auto-created on first upload via `fs.mkdir(UPLOAD_DIR, { recursive: true })`

## Validation Rules

### File Type
Valid MIME types:
- `audio/mpeg`
- `audio/mp3`
- `audio/wav`
- `audio/ogg`

### File Size
- Maximum: 50MB (52,428,800 bytes)
- Validated on both client and server sides

## Development Commands

```bash
pnpm dev      # Start development server with Turbopack
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Common Issues & Solutions

### Issue: "can't access property 'title', currentTrack is undefined"
**Cause**: No tracks uploaded and trying to display track info.
**Solution**: Always check if `currentTrack` exists before accessing its properties using optional chaining (`currentTrack?.title`) or conditional rendering.

### Issue: Audio not playing after upload
**Causes**:
1. File format not supported by browser
2. File corrupted during upload
3. CORS issues (unlikely with local uploads)

**Debugging**:
- Check browser console for audio errors
- Verify file was written to disk correctly
- Test file directly in browser URL

### Issue: Track duration shows as NaN or 0:00
**Cause**: Metadata not loaded yet.
**Solution**: The `handleLoadedMetadata` function handles this, but ensure the track is actually loaded before seeking.

## TypeScript Configuration
- Target: ES2017
- Module Resolution: bundler
- Strict mode enabled
- Path alias: `@/*` resolves to project root

## Tailwind CSS v4 Notes
- Uses new configuration syntax in `postcss.config.mjs`
- Dark mode via `dark:` prefix (class strategy)
- Custom colors and utilities can be added in `app/globals.css`

## Future Enhancement Ideas
1. Playlist management (add/remove tracks from queue)
2. Audio visualization/equalizer
3. Track metadata parsing (ID3 tags for artist, album art)
4. Cloud storage integration (AWS S3, etc.)
5. Background playback support
6. Keyboard shortcuts for controls
