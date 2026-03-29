# Audio Player - Development Guidelines for AI Agents

## Agent Workflow Requirements

### Before Making Changes
**Always create a step-by-step guide first**, share it with the user, and wait for approval before proceeding with implementation.

### Debugging Non-Obvious Issues
When a fix doesn't resolve the issue:
1. **Perform a discovery step**: Add console.logs to understand the actual state/behavior
2. Review logs yourself or ask the user to check them
3. Perform a sanity check based on findings
4. Only proceed with fixes once the issue is clearly understood

---

## Project Overview
**Audio Player**: A Next.js 16 + React 19 client-side audio player with IndexedDB storage, bookmarking, AB loop functionality, and **multiple configuration support**.

### Multiple Configurations
The app now supports multiple independent configurations, each with its own:
- Audio tracks library
- Bookmarks
- AB loop settings
- Active loop state

This allows users to maintain separate projects (e.g., different albums, podcasts, or sessions) within the same app instance.

---

## Tech Stack
- **Framework**: Next.js 16.2.1 (App Router, Server Components by default)
- **React**: 19.2.4 (hooks-only, `"use client"` for interactive components)
- **Styling**: Tailwind CSS v4 + CSS variables for dark mode
- **Storage**: IndexedDB (`audioPlayerDB`), localStorage for bookmarks/loops
- **Libraries**: `lucide-react`, `jszip`, `uuid`

---

## File Structure & Conventions

### TypeScript & ESLint
- **Strict mode enabled** (`tsconfig.json`: `"strict": true`)
- Path alias: `@/*` → root directory
- ESLint: `eslint-config-next` with core web vitals + TypeScript rules
- Always type props, state, and API responses

### Component Patterns
- **Client Components**: Mark with `"use client"` at top for interactivity
- **Default exports** only (e.g., `export default function Home()`)
- **Props interfaces** defined above components (e.g., `interface AudioUploaderProps`)
- **Named interfaces** for shared types in same file or `@/lib/types.ts`

### State Management
- Use React hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Complex state: `useReducer` when multiple related values change together
- Blob URL cleanup: Track in `useRef<Map<string, string>>` or `Set<string>` and revoke on unmount

### File Naming
- **Components**: PascalCase (e.g., `AudioUploader.tsx`, `BookmarkModal.tsx`)
- **Libraries**: lowercase with hyphens (e.g., `wav-encoder.ts`)
- **Routes**: lowercase with hyphens in directories (e.g., `app/uploads/`)

---

## Storage Patterns

### IndexedDB (`@/lib/storage.ts`)
```typescript
const DB_NAME = 'AudioPlayerDB';
const DB_VERSION = 4;  // Bumped for blob storage support
const STORE_NAME = 'audios';

// Always wrap promises around IDB operations
export async function storeAudio(audio: StoredAudio): Promise<void> { ... }
export async function getAllAudios(): Promise<StoredAudio[]> { ... }
```

### StoredAudio Interface
```typescript
interface StoredAudio {
  id: string;
  title: string;
  dataUrl: string;        // Legacy base64 format (for backward compat)
  blob: Blob;             // New blob storage (for large files)
  usesBlob: boolean;      // true = blob storage, false = legacy base64
  size: number;
  duration: number;
  uploadedAt: number;
}
```

### Configuration-Based Storage Keys
Each configuration has its own localStorage namespace:
- `{configId}_bookmarks` → `Bookmark[]`
- `{configId}_loops` → `ABLoop[]`
- `{configId}_activeLoop` → `string | null`

### Legacy Storage Keys (backward compatibility)
- `audioPlayerBookmarks` → `Record<string, Bookmark[]>`
- `audioPlayerABLoops` → `Record<string, ABLoop[]>`
- `audioPlayerActiveLoop` → `string | null`

### Configuration Management (`@/lib/configuration.ts`)
```typescript
interface Configuration {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// Core functions
export function initializeDefaultConfiguration(): Configuration | null;
export function getAllConfigurations(): Promise<Configuration[]>;
export function createConfiguration(name: string): Promise<Configuration>;
export function updateConfiguration(id: string, updates: Partial<Configuration>): Promise<void>;
export function deleteConfiguration(id: string): Promise<void>;
export function setActiveConfigurationId(id: string): Promise<void>;
export function getActiveConfigurationId(): Promise<string | null>;
```

### Storage Keys Helper
```typescript
// Get configuration-specific storage keys
export function getConfigurationStorageKeys(configId: string) {
  return {
    bookmarksKey: `${configId}_bookmarks`,
    loopsKey: `${configId}_loops`,
    activeLoopKey: `${configId}_activeLoop`,
  };
}
```

---

## UI/UX Conventions

### Dark Mode
- Use CSS variables: `--background`, `--foreground`
- Tailwind dark mode: `dark:bg-zinc-900 dark:text-zinc-100`
- Theme defined in `app/globals.css` with `@theme inline`

### Form Elements
- Controlled inputs with `value` + `onChange`
- Disabled state: `disabled:opacity-50 disabled:cursor-not-allowed`
- Focus rings: `focus:outline-none focus:ring-2 focus:ring-zinc-500`

### Animations & Transitions
- CSS transitions: `transition-colors duration-200`
- SVG spinners for loading states with `animate-spin`
- Touch actions: `touchAction: 'pan-y'` for swipe gestures

### Responsive Design
- Use responsive Tailwind prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Main container: `w-full max-w-md` for centered layout on all screens
- Controls: Use `flex flex-wrap items-center justify-center` for wrapping on narrow screens
- Maintain desktop appearance with `md:` breakpoints for larger screens

---

## Key Operations

### File Uploads
1. Validate type/extension + max size (50MB)
2. Store file as **Blob** directly (not base64) for large files
3. Create blob URL from Blob for playback
4. Revoke blob URLs on cleanup

**Note:** Blob storage is preferred for large files. Legacy base64 storage is still supported for backward compatibility but converts to blob format on first load.

### Audio Playback
- Use `<audio ref={audioRef}>` element
- Track `currentTime`, `duration`, `volume`, `isMuted`
- AB loops: Jump to A point when reaching B point during playback

### Imports
- **Zip format**: Extract `meta.json` + audio files
- **Metadata versioning**: Supports `"version": "0.2"` and `"version": "0.3"`
- **Multiple configurations**: Import creates new configuration with zip filename as name
- **Blob storage**: Imports now store files as blobs directly
- **Metadata includes**: `"version"`, `"name"`, `"audios"[]`, `"usesBlob"`, `"dataUrl"`

### Exports
- **Zip format**: Contains `meta.json` + audio files
- **Metadata versioning**: `"version": "0.2"` (legacy) or `"version": "0.3"` (with blob support)
- **Metadata includes**: `"version"`, `"name"`, `"audios"[]`, `"usesBlob"`, `"dataUrl"`
- **Sanitize filenames**: Replace special chars, max 50 chars
- **AB loop export**: Can export active AB loop as MP3

---

## Error Handling
- Wrap async operations in try/catch
- Log errors to console with context
- Show user-friendly alerts or inline error messages
- Never swallow errors silently

---

## Build & Run Commands
- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Start**: `pnpm start`
- **Lint**: `pnpm lint`

Always use `pnpm` instead of `npm` or `npx`.
