import { sampleTrack, TIME_EPS } from '@/core/interpolation'
import type { FrameModel, Project, Segment, SegmentEffects, TrackKey } from '@/types/project'
import { NEUTRAL_EFFECTS, NEUTRAL_TRANSFORM, TRACK_KEYS } from '@/types/project'

// 找到覆盖 time 的段。边界规则：[start, end)，末段 end 用 eps 包容
export const findSegmentAt = (segments: Segment[], time: number): Segment | null => {
  for (const segment of segments) {
    const atEnd = time >= segment.end - TIME_EPS && time <= segment.end + TIME_EPS
    if ((time >= segment.start - TIME_EPS && time < segment.end - TIME_EPS) || atEnd) {
      return segment
    }
  }
  return null
}

const neutralFrame = (): FrameModel => ({
  x: NEUTRAL_TRANSFORM.x,
  y: NEUTRAL_TRANSFORM.y,
  scale: NEUTRAL_TRANSFORM.scale,
  opacity: NEUTRAL_TRANSFORM.opacity,
  effects: { ...NEUTRAL_EFFECTS },
  segmentId: null,
})

// 任意时刻的画面模型。渲染器与单测都只信这一个纯函数
export const evaluateAt = (project: Pick<Project, 'segments'>, time: number): FrameModel => {
  const segment = findSegmentAt(project.segments, time)
  if (!segment) return neutralFrame()

  const frame = neutralFrame()
  frame.segmentId = segment.id
  for (const key of TRACK_KEYS) {
    frame[key as TrackKey] = sampleTrack(segment.keyframes[key], time, key)
  }
  frame.effects = { ...segment.effects }
  return frame
}

// 段外区域的特效恒为中性，段内取段配置
export const effectsAt = (project: Pick<Project, 'segments'>, time: number): SegmentEffects => {
  const segment = findSegmentAt(project.segments, time)
  return segment ? { ...segment.effects } : { ...NEUTRAL_EFFECTS }
}
