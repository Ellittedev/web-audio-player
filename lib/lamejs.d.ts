declare module 'lamejs' {
  export class MP3Encoder {
    constructor(
      numChannels: number,
      samplerate: number,
      bitrate: number,
      quality: number,
      mode?: 'stereo' | 'mono' | 'joint-stereo' | 'dual-channel'
    );
    encode(samples: Int16Array): Uint8Array | null;
    flush(): Uint8Array | null;
  }

  export class Lame {
    static getLameVersion(): string;
  }
}
