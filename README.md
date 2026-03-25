# Web Audio Player

A modern, feature-rich web audio player built with Next.js 16 and React 19. Upload, manage, and play multiple audio files directly in your browser with a beautiful UI powered by Tailwind CSS.

## Features

- 🎵 **Multiple Audio Support**: Upload and play multiple audio files simultaneously
- 📁 **Batch Upload**: Drag-and-drop or select multiple files at once
- 💾 **ZIP Export**: Download selected audio files as a ZIP archive
- 🎚️ **Audio Controls**: Full playback controls including play, pause, seek, and volume
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS 4
- ⚡ **Fast Performance**: Optimized with Next.js App Router and Server Components
- 🔍 **Search & Filter**: Quickly find audio files in your library

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **UI Library**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **File Compression**: [JSZip](https://stuk.github.io/jszip/)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org)

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ellittedev/web-audio-player.git
cd web-audio-player
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

## Usage

1. **Upload Audio Files**: Click the upload button or drag and drop audio files onto the player area.
2. **Play/Pause**: Use the play/pause button to control playback.
3. **Seek**: Drag the progress bar to seek to any position in the audio.
4. **Adjust Volume**: Use the volume slider to control playback volume.
5. **Export as ZIP**: Select multiple files and click "Download ZIP" to export them.

## Project Structure

```
audio-player/
├── app/                  # Next.js App Router pages
│   └── page.tsx         # Main audio player interface
├── components/          # React components
│   ├── AudioPlayer.tsx  # Core audio player component
│   └── AudioList.tsx    # List of uploaded audio files
├── lib/                 # Utility functions and helpers
├── public/              # Static assets
├── uploads/             # Uploaded audio files storage
└── package.json         # Project dependencies
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org) team for the amazing framework
- [Tailwind Labs](https://tailwindcss.com) for the beautiful CSS framework
- All contributors who have helped improve this project

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ by [Ellittedev](https://github.com/Ellittedev)
