declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(
      numChannels: number,
      samplerate: number,
      bitrate: number
    );
    encodeBuffer(left: Float32Array, right: Float32Array): Uint8Array;
    flush(): Uint8Array;
  }

  export const Lame: any;
}
