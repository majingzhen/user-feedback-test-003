import { probeWebmMimeType } from '@/core/exporter/mimeType'
import type { Exporter, ExportResult } from '@/core/exporter/types'

// 同一 video 元素只能 createMediaElementSource 一次，模块级缓存
const audioGraphCache = new WeakMap<
  HTMLVideoElement,
  { context: AudioContext; source: MediaElementAudioSourceNode; destination: MediaStreamAudioDestinationNode }
>()

const getAudioGraph = (video: HTMLVideoElement) => {
  const cached = audioGraphCache.get(video)
  if (cached) return cached

  const context = new AudioContext()
  const source = context.createMediaElementSource(video)
  const destination = context.createMediaStreamDestination()
  // 一路进录制目标，一路进扬声器供本机监听
  source.connect(destination)
  source.connect(context.destination)
  const graph = { context, source, destination }
  audioGraphCache.set(video, graph)
  return graph
}

const once = (target: EventTarget, event: string, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onEvent)
      signal.removeEventListener('abort', onAbort)
    }
    const onEvent = () => {
      cleanup()
      resolve()
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('导出已取消', 'AbortError'))
    }
    target.addEventListener(event, onEvent)
    signal.addEventListener('abort', onAbort, { once: true })
  })

const seekToZero = (video: HTMLVideoElement, signal: AbortSignal): Promise<void> => {
  if (video.currentTime === 0) return Promise.resolve()
  const done = once(video, 'seeked', signal)
  video.currentTime = 0
  return done
}

// v1：实时同步录制。视频播放与 rAF 渲染共用媒体时钟，音画同源，停录以 ended 为准
export const realtimeExporter: Exporter = {
  async exportVideo({ canvas, video, fps, bitrate, duration, onProgress, signal }) {
    const mimeType = probeWebmMimeType()
    if (!mimeType) throw new Error('当前浏览器不支持 WebM 录制，请换用 Chrome 或 Edge')

    const graph = getAudioGraph(video)
    await graph.context.resume()

    const wasLooping = video.loop
    video.loop = false
    video.pause()
    await seekToZero(video, signal)

    const canvasStream = canvas.captureStream(fps)
    const mixedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...graph.destination.stream.getAudioTracks(),
    ])

    const recorder = new MediaRecorder(mixedStream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    const expectedFrames = Math.round(duration * fps)
    let renderedFrames = 0
    let rafHandle = 0
    const tick = () => {
      renderedFrames += 1
      onProgress({
        phase: 'recording',
        elapsed: Math.min(video.currentTime, duration),
        duration,
      })
      rafHandle = requestAnimationFrame(tick)
    }

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })

    onProgress({ phase: 'prepare', elapsed: 0, duration })
    recorder.start(1000)
    rafHandle = requestAnimationFrame(tick)

    try {
      await video.play()
      // 以视频 ended 停录，不用 setTimeout，避免尾部黑帧或丢尾
      await once(video, 'ended', signal)
    } catch (error) {
      cancelAnimationFrame(rafHandle)
      recorder.state !== 'inactive' && recorder.stop()
      video.loop = wasLooping
      throw error
    }

    cancelAnimationFrame(rafHandle)
    onProgress({ phase: 'finalizing', elapsed: duration, duration })
    if (recorder.state !== 'inactive') recorder.stop()
    await stopped

    video.loop = wasLooping
    mixedStream.getTracks().forEach((track) => track.stop())

    const blob = new Blob(chunks, { type: mimeType })
    return {
      blob,
      mimeType,
      expectedFrames,
      renderedFrames,
      frameDropRatio: expectedFrames > 0 ? Math.max(0, 1 - renderedFrames / expectedFrames) : 0,
    }
  },
}
