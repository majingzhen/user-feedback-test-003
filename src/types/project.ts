export const SCHEMA_VERSION = 1

export type EasingType = 'linear' | 'easeInOut'

export type TrackKey = 'x' | 'y' | 'scale' | 'opacity'

export const TRACK_KEYS: TrackKey[] = ['x', 'y', 'scale', 'opacity']

export const TRACK_LABELS: Record<TrackKey, string> = {
  x: '位置 X',
  y: '位置 Y',
  scale: '缩放',
  opacity: '透明度',
}

export interface Keyframe {
  id: string
  // 项目绝对时间轴，秒
  time: number
  value: number
  // 作用于「本帧 → 下一帧」区间
  easing: EasingType
}

export type TransformTracks = Record<TrackKey, Keyframe[]>

export type EffectKey = 'brightness' | 'contrast' | 'blur' | 'hueRotate'

export const EFFECT_KEYS: EffectKey[] = ['brightness', 'contrast', 'blur', 'hueRotate']

export const EFFECT_LABELS: Record<EffectKey, string> = {
  brightness: '亮度',
  contrast: '对比度',
  blur: '模糊',
  hueRotate: '色调',
}

// 各特效的中性值与取值范围（滑块用）
export const EFFECT_SPEC: Record<EffectKey, { neutral: number; min: number; max: number; step: number; unit: string }> = {
  brightness: { neutral: 1, min: 0, max: 2, step: 0.01, unit: '' },
  contrast: { neutral: 1, min: 0, max: 2, step: 0.01, unit: '' },
  blur: { neutral: 0, min: 0, max: 20, step: 0.1, unit: 'px' },
  hueRotate: { neutral: 0, min: 0, max: 360, step: 1, unit: 'deg' },
}

export type SegmentEffects = Record<EffectKey, number>

export interface Segment {
  id: string
  start: number
  end: number
  locked: boolean
  keyframes: TransformTracks
  // 与 keyframes 顶层物理隔离，锁定态下仍可编辑
  effects: SegmentEffects
}

export interface VideoMeta {
  fileName: string
  fileSize: number
  lastModified: number
  videoWidth: number
  videoHeight: number
  duration: number
  mimeType: string
  // name|size|lastModified，重选文件时校验
  identity: string
  blobStored: boolean
}

export interface CanvasConfig {
  exportWidth: number
  exportHeight: number
  background: string
}

export interface Project {
  schemaVersion: number
  id: string
  name: string
  videoMeta: VideoMeta | null
  duration: number
  segments: Segment[]
  canvas: CanvasConfig
  createdAt: number
  updatedAt: number
}

// 渲染热路径使用的普通对象快照（不经 reactive proxy）
export interface FrameModel {
  x: number
  y: number
  scale: number
  opacity: number
  effects: SegmentEffects
  segmentId: string | null
}

// 轨道中性默认值：空轨道不改变画面
export const NEUTRAL_TRANSFORM: Record<TrackKey, number> = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
}

export const NEUTRAL_EFFECTS: SegmentEffects = {
  brightness: 1,
  contrast: 1,
  blur: 0,
  hueRotate: 0,
}
