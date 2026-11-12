import type { EasingType, Keyframe, TrackKey } from '@/types/project'
import { NEUTRAL_TRANSFORM } from '@/types/project'

// 视频时间基常用精度，统一用它做浮点比较，避免 currentTime 末位抖动
export const TIME_EPS = 1 / 30000

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))

// smoothstep，easeInOut 端点斜率为 0
export const easeInOut = (t: number): number => t * t * (3 - 2 * t)

const applyEasing = (easing: EasingType, t: number): number =>
  easing === 'easeInOut' ? easeInOut(t) : t

// 二分定位 time 落在 track 的哪两个相邻帧之间
const bracket = (track: Keyframe[], time: number): [Keyframe, Keyframe] => {
  let lo = 0
  let hi = track.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (track[mid].time <= time) lo = mid
    else hi = mid
  }
  return [track[lo], track[hi]]
}

// 轨道求值：空轨道回中性值；首帧前/末帧后钳制 hold；帧间插值
export const sampleTrack = (track: Keyframe[], time: number, key: TrackKey): number => {
  const neutral = NEUTRAL_TRANSFORM[key]
  if (track.length === 0) return neutral
  if (time <= track[0].time + TIME_EPS) return track[0].value
  const last = track[track.length - 1]
  if (time >= last.time - TIME_EPS) return last.value

  const [a, b] = bracket(track, time)
  if (b.time - a.time <= TIME_EPS) return b.value
  const t = (time - a.time) / (b.time - a.time)
  return lerp(a.value, b.value, applyEasing(a.easing, clamp(t, 0, 1)))
}

// 插入或更新同时间点的帧，返回保持升序的新数组
export const upsertKeyframe = (track: Keyframe[], frame: Keyframe): Keyframe[] => {
  const idx = track.findIndex((k) => Math.abs(k.time - frame.time) <= TIME_EPS)
  const next = idx >= 0 ? track.map((k) => (k.id === track[idx].id ? frame : k)) : [...track, frame]
  return next.sort((a, b) => a.time - b.time)
}

export const removeKeyframe = (track: Keyframe[], id: string): Keyframe[] =>
  track.filter((k) => k.id !== id)
