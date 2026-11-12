import { evaluateAt } from '@/core/evaluate'
import type {
  Project,
  Segment,
  SegmentEffects,
  TransformTracks,
  VideoMeta,
} from '@/types/project'
import { NEUTRAL_EFFECTS, SCHEMA_VERSION } from '@/types/project'

export class SegmentLockedError extends Error {
  constructor(segmentId: string) {
    super(`段 ${segmentId} 已锁定，关键帧只读`)
    this.name = 'SegmentLockedError'
  }
}

// 锁定守卫：所有写 keyframes 的 store action 第一行统一调用
export const assertSegmentUnlocked = (segment: Segment): void => {
  if (segment.locked) throw new SegmentLockedError(segment.id)
}

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const emptyTracks = (): TransformTracks => ({ x: [], y: [], scale: [], opacity: [] })

const neutralEffects = (): SegmentEffects => ({ ...NEUTRAL_EFFECTS })

export const createProject = (name: string): Project => ({
  schemaVersion: SCHEMA_VERSION,
  id: uid('project'),
  name,
  videoMeta: null,
  duration: 0,
  segments: [],
  canvas: { exportWidth: 0, exportHeight: 0, background: '#000000' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const createVideoMeta = (file: File, width: number, height: number, duration: number): VideoMeta => ({
  fileName: file.name,
  fileSize: file.size,
  lastModified: file.lastModified,
  videoWidth: width,
  videoHeight: height,
  duration,
  mimeType: file.type,
  identity: buildIdentity(file),
  blobStored: false,
})

export const buildIdentity = (file: File): string =>
  `${file.name}|${file.size}|${file.lastModified}`

// 新建段。若与已有段相邻，播种边界时刻的 hold 值，避免边界误触阶跃
export const createSegment = (
  start: number,
  end: number,
  project: Pick<Project, 'segments'>,
): Segment => {
  const segment: Segment = {
    id: uid('seg'),
    start,
    end,
    locked: false,
    keyframes: emptyTracks(),
    effects: neutralEffects(),
  }
  const boundaryFrame = evaluateAt(project, start)
  if (boundaryFrame.segmentId) {
    // 仅在与前一段相邻时播种（求值命中了别的段）
    const seed = (track: 'x' | 'y' | 'scale' | 'opacity') => [
      { id: uid('kf'), time: start, value: boundaryFrame[track], easing: 'linear' as const },
    ]
    segment.keyframes = {
      x: seed('x'),
      y: seed('y'),
      scale: seed('scale'),
      opacity: seed('opacity'),
    }
  }
  return segment
}

// 段区间是否与现有段重叠（忽略 excludeId 自身）
export const overlapsExisting = (
  segments: Segment[],
  start: number,
  end: number,
  excludeId?: string,
): boolean =>
  segments.some(
    (s) => s.id !== excludeId && start < s.end && end > s.start,
  )

// 文档级迁移入口；当前只有版本 1，预留向前兼容
export const migrate = (raw: unknown): Project => {
  const project = raw as Project
  if (!project || typeof project !== 'object' || !('segments' in project)) {
    throw new Error('工程文件结构非法，无法恢复')
  }
  if (project.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`工程版本 ${project.schemaVersion} 高于当前支持版本，请升级工具`)
  }
  return project
}
