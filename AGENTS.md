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
**Audio Player**: A Next.js 16 + React 19 client-side audio player with IndexedDB storage, bookmarking, and AB loop functionality.

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
const DB_VERSION = 1;
const STORE_NAME = 'audios';

// Always wrap promises around IDB operations
export async function storeAudio(audio: StoredAudio): Promise<void> { ... }
export async function getAllAudios(): Promise<StoredAudio[]> { ... }
```

### localStorage Keys
- `audioPlayerBookmarks` → `Record<string, Bookmark[]>` (trackId → bookmarks)
- `audioPlayerABLoops` → `Record<string, ABLoop[]>` (trackId → loops)
- `audioPlayerActiveLoop` → `string | null`

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

---

## Key Operations

### File Uploads
1. Validate type/extension + max size (50MB)
2. Convert to base64 data URL for IndexedDB storage
3. Create blob URL from data URL for playback
4. Revoke blob URLs on cleanup

### Audio Playback
- Use `<audio ref={audioRef}>` element
- Track `currentTime`, `duration`, `volume`, `isMuted`
- AB loops: Jump to A point when reaching B point during playback

### Exports
- Zip format with `meta.json` + audio files
- Metadata versioning: `"version": "0.2"`
- Sanitize filenames: replace special chars, max 50 chars

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
