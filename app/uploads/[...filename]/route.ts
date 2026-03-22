import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { promises as fs } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Extract filename from path like /uploads/filename.mp3
  const filename = pathname.replace('/uploads/', '');

  if (!filename) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const filepath = join(UPLOAD_DIR, filename);

  try {
    const file = await fs.readFile(filepath);
    const stat = await fs.stat(filepath);

    // Determine content type based on extension
    const contentType = filename.endsWith('.mp3')
      ? 'audio/mpeg'
      : filename.endsWith('.wav')
      ? 'audio/wav'
      : filename.endsWith('.ogg')
      ? 'audio/ogg'
      : 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File not found:', filename);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
