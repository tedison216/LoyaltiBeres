declare module '@zxing/library' {
  export class Result {
    getText(): string
  }
}

declare module '@zxing/browser' {
  import type { Result } from '@zxing/library'

  export interface IScannerControls {
    stop(): void
  }

  export class BrowserMultiFormatReader {
    decodeFromVideoDevice(
      deviceId: string | undefined,
      videoElement: HTMLVideoElement,
      callback: (result: Result | undefined, error?: Error, controls?: IScannerControls) => void
    ): Promise<IScannerControls>
    decodeFromConstraints(
      constraints: MediaStreamConstraints,
      videoElement: HTMLVideoElement,
      callback: (result: Result | undefined, error?: Error, controls?: IScannerControls) => void
    ): Promise<IScannerControls>
    reset(): void
    decodeFromImageUrl?(url: string): Promise<Result>
  }

  export class BrowserQRCodeReader {
    decodeFromImageElement(element: HTMLImageElement): Promise<Result>
    decodeFromCanvas(canvas: HTMLCanvasElement): Promise<Result>
  }
}
