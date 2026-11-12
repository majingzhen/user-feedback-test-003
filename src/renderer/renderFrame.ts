import { buildFilterString } from '@/core/filter'
import { containRect } from '@/core/geometry'
import type { FrameModel, Segment } from '@/types/project'

export interface RenderSnapshot {
  segments: Segment[]
  duration: number
  background: string
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  video: HTMLVideoElement
  // CSS 像素尺寸（后备存储已按 dpr 建好，dpr 由 setTransform 消化）
  cssWidth: number
  cssHeight: number
  dpr: number
}

// 探测浏览器是否支持 canvas filter（Safari 18 之前不支持）
export const supportsCanvasFilter = (): boolean =>
  typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype

// 唯一绘制函数。不 import 任何 Vue 符号，预览 rAF 与导出循环共用，保证逐帧一致
export const renderFrame = (
  time: number,
  frame: FrameModel,
  snapshot: Pick<RenderSnapshot, 'background'>,
  rc: RenderContext,
): void => {
  const { ctx, video, cssWidth, cssHeight, dpr } = rc
  if (!video.videoWidth) return

  // 1. 重置变换并铺背景底（blur 会透出边缘，黑底兜底防闪烁）
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.filter = 'none'
  ctx.fillStyle = snapshot.background
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  const rect = containRect(cssWidth, cssHeight, video.videoWidth, video.videoHeight)
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2

  ctx.save()
  // 2. 滤镜链（固定顺序，无特效显式 none）
  ctx.filter = buildFilterString(frame.effects)
  // 3. 透明度
  ctx.globalAlpha = frame.opacity
  // 4. 先到画面中心再加用户位移，最后缩放 —— 缩放始终绕中心
  ctx.translate(cx + frame.x, cy + frame.y)
  ctx.scale(frame.scale, frame.scale)
  ctx.drawImage(video, -rect.width / 2, -rect.height / 2, rect.width, rect.height)
  ctx.restore()

  // 复位，避免 filter/alpha 跨帧残留
  ctx.filter = 'none'
  ctx.globalAlpha = 1
}
