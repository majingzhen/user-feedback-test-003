/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface HTMLVideoElement {
  requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

interface VideoFrameMetadata {
  mediaTime: number
}

type VideoFrameRequestCallback = (now: number, metadata: VideoFrameMetadata) => void
