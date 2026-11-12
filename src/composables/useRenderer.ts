import { onBeforeUnmount, toRaw, type Ref } from 'vue'

import { evaluateAt } from '@/core/evaluate'
import { backingSize, boundedDpr, evenFloor } from '@/core/geometry'
import { renderFrame, supportsCanvasFilter, type RenderSnapshot } from '@/renderer/renderFrame'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'

// 渲染循环：rAF 主驱动 + seeked 即时重绘 + rVFC 媒体时间校正
// 高频状态全部闭包普通变量，快照为普通对象，rAF 热路径零响应式写入
export const useRenderer = (canvasRef: Ref<HTMLCanvasElement | null>) => {
  const projectStore = useProjectStore()
  const playerStore = usePlayerStore()

  const filterSupported = supportsCanvasFilter()

  let ctx: CanvasRenderingContext2D | null = null
  let video: HTMLVideoElement | null = null
  let rafHandle = 0
  let rVfcHandle = 0
  let cssWidth = 0
  let cssHeight = 0
  let dpr = 1
  let lastUiSync = 0
  let resizeObserver: ResizeObserver | null = null

  // 普通对象快照，编辑后原子替换引用
  let snapshot: RenderSnapshot | null = null

  // 普通对象快照，结构化克隆彻底脱掉 reactive proxy，rAF 热路径零代理开销
  const buildSnapshot = (): RenderSnapshot => {
    const raw = toRaw(projectStore.project)
    return structuredClone({
      duration: raw.duration,
      background: raw.canvas.background,
      segments: raw.segments,
    })
  }

  const syncSnapshot = () => {
    snapshot = buildSnapshot()
  }

  const resizeCanvas = () => {
    if (!canvasRef.value || !video) return
    const rect = canvasRef.value.getBoundingClientRect()
    cssWidth = rect.width
    cssHeight = rect.height
    dpr = boundedDpr(window.devicePixelRatio)
    const backing = backingSize(cssWidth, cssHeight, dpr)
    canvasRef.value.width = backing.width
    canvasRef.value.height = backing.height
    draw(video.currentTime)
  }

  const draw = (time: number) => {
    if (!ctx || !video || !snapshot || !video.videoWidth) return
    const frame = evaluateAt(snapshot, time)
    renderFrame(time, frame, snapshot, {
      ctx,
      video,
      cssWidth,
      cssHeight,
      dpr,
    })
  }

  const loop = () => {
    if (!video) return
    draw(video.currentTime)
    // 播放头 UI 50ms 节流回写
    const now = performance.now()
    if (now - lastUiSync > 50) {
      lastUiSync = now
      playerStore.setCurrentTime(video.currentTime)
    }
    rafHandle = requestAnimationFrame(loop)
  }

  const onSeeked = () => {
    if (video) draw(video.currentTime)
  }

  const onRvfc: VideoFrameRequestCallback = (_now, metadata) => {
    if (video) {
      draw(metadata.mediaTime)
      rVfcHandle = video.requestVideoFrameCallback?.(onRvfc) ?? 0
    }
  }

  const mount = (videoElement: HTMLVideoElement) => {
    video = videoElement
    const canvas = canvasRef.value
    if (!canvas) return
    ctx = canvas.getContext('2d')
    syncSnapshot()

    resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvas)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('loadedmetadata', resizeCanvas)
    if (video.requestVideoFrameCallback) {
      rVfcHandle = video.requestVideoFrameCallback(onRvfc)
    }
    rafHandle = requestAnimationFrame(loop)
  }

  // 导出时切换为目标分辨率后备存储（偶数化），结束后恢复预览尺寸
  const setExportBacking = (width: number, height: number) => {
    if (!canvasRef.value) return
    canvasRef.value.width = evenFloor(width)
    canvasRef.value.height = evenFloor(height)
    cssWidth = canvasRef.value.width
    cssHeight = canvasRef.value.height
    dpr = 1
  }

  const restorePreviewBacking = () => resizeCanvas()

  const drawOnce = (time: number) => draw(time)

  const getCanvas = () => canvasRef.value

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafHandle)
    if (video?.cancelVideoFrameCallback && rVfcHandle) video.cancelVideoFrameCallback(rVfcHandle)
    video?.removeEventListener('seeked', onSeeked)
    video?.removeEventListener('loadedmetadata', resizeCanvas)
    resizeObserver?.disconnect()
  })

  return {
    canvasRef,
    filterSupported,
    mount,
    syncSnapshot,
    resizeCanvas,
    drawOnce,
    setExportBacking,
    restorePreviewBacking,
    getCanvas,
  }
}
