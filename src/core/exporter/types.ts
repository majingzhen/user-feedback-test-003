export interface ExporterProgress {
  phase: 'prepare' | 'recording' | 'finalizing'
  elapsed: number
  duration: number
}

export interface ExportResult {
  blob: Blob
  mimeType: string
  expectedFrames: number
  renderedFrames: number
  frameDropRatio: number
}

export interface Exporter {
  exportVideo(input: {
    canvas: HTMLCanvasElement
    video: HTMLVideoElement
    fps: number
    bitrate: number
    duration: number
    onProgress: (p: ExporterProgress) => void
    signal: AbortSignal
  }): Promise<ExportResult>
}
