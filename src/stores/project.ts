import { defineStore } from 'pinia'

import { evaluateAt } from '@/core/evaluate'
import { clamp, removeKeyframe, TIME_EPS, upsertKeyframe } from '@/core/interpolation'
import {
  assertSegmentUnlocked,
  createProject,
  createSegment,
  createVideoMeta,
  overlapsExisting,
  uid,
} from '@/core/schema'
import {
  canStoreBlob,
  requestPersistentStorage,
  saveProject,
  saveProjectWithAsset,
} from '@/persistence/idb'
import type {
  EffectKey,
  EasingType,
  Project,
  Segment,
  TrackKey,
} from '@/types/project'
import { EFFECT_SPEC, NEUTRAL_EFFECTS } from '@/types/project'

interface ProjectState {
  project: Project
  selectedSegmentId: string | null
  selectedKeyframeId: string | null
  videoUrl: string | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  storageDegraded: boolean
}

// 视频文件不进响应式，单独持有在模块闭包里，避免大 Blob 被 proxy 化
const videoBlobHolder: { file: File | null } = { file: null }

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    project: createProject('未命名工程'),
    selectedSegmentId: null,
    selectedKeyframeId: null,
    videoUrl: null,
    saveState: 'idle',
    storageDegraded: false,
  }),

  getters: {
    segments: (state): Segment[] => state.project.segments,
    selectedSegment(state): Segment | null {
      return state.project.segments.find((s) => s.id === state.selectedSegmentId) ?? null
    },
    duration: (state) => state.project.duration,
    hasVideo: (state) => state.project.videoMeta !== null,
  },

  actions: {
    // ---------- 工程与视频 ----------
    async importVideo(file: File, duration: number, width: number, height: number) {
      this.revokeVideoUrl()
      const videoMeta = createVideoMeta(file, width, height, duration)
      const storable = await canStoreBlob(file.size)
      videoMeta.blobStored = storable
      this.storageDegraded = !storable

      videoBlobHolder.file = file
      this.videoUrl = URL.createObjectURL(file)

      const project = createProject(file.name.replace(/\.[^.]+$/, '') || '未命名工程')
      project.videoMeta = videoMeta
      project.duration = duration
      project.canvas = {
        exportWidth: width,
        exportHeight: height,
        background: '#000000',
      }
      this.project = project
      this.selectedSegmentId = null
      this.selectedKeyframeId = null

      await requestPersistentStorage()
      if (storable) {
        await saveProjectWithAsset(this.project, file, videoMeta)
      } else {
        await saveProject(this.project)
      }
      this.saveState = 'saved'
    },

    // 大文件降级后，重新选择源视频并校验 identity
    async relinkVideo(file: File): Promise<boolean> {
      const meta = this.project.videoMeta
      if (!meta) return false
      const identity = `${file.name}|${file.size}|${file.lastModified}`
      if (identity !== meta.identity) return false

      this.revokeVideoUrl()
      videoBlobHolder.file = file
      this.videoUrl = URL.createObjectURL(file)

      const storable = await canStoreBlob(file.size)
      meta.blobStored = storable
      this.storageDegraded = !storable
      if (storable) {
        await saveProjectWithAsset(this.project, file, meta)
      } else {
        await saveProject(this.project)
      }
      return true
    },

    hydrate(project: Project, file: File | null, url: string | null) {
      this.project = project
      this.videoUrl = url
      if (file) videoBlobHolder.file = file
      this.storageDegraded = project.videoMeta?.blobStored === false
      this.selectedSegmentId = project.segments[0]?.id ?? null
    },

    revokeVideoUrl() {
      if (this.videoUrl) {
        URL.revokeObjectURL(this.videoUrl)
        this.videoUrl = null
      }
    },

    async persist() {
      // 没有视频的空工程不落库，避免产生无意义记录
      if (!this.project.videoMeta) return
      this.project.updatedAt = Date.now()
      this.saveState = 'saving'
      try {
        const file = videoBlobHolder.file
        const meta = this.project.videoMeta
        if (file && meta.blobStored) {
          await saveProjectWithAsset(this.project, file, meta)
        } else {
          await saveProject(this.project)
        }
        this.saveState = 'saved'
      } catch {
        this.saveState = 'error'
      }
    },

    // ---------- 段 ----------
    selectSegment(id: string | null) {
      this.selectedSegmentId = id
      this.selectedKeyframeId = null
    },

    addSegment(start: number, end: number): Segment | null {
      const duration = this.project.duration
      const safeStart = clamp(start, 0, duration - TIME_EPS)
      const safeEnd = clamp(end, safeStart + 0.1, duration)
      if (overlapsExisting(this.project.segments, safeStart, safeEnd)) return null

      const segment = createSegment(safeStart, safeEnd, this.project)
      this.project.segments.push(segment)
      this.project.segments.sort((a, b) => a.start - b.start)
      this.selectedSegmentId = segment.id
      return segment
    },

    // 段起止调整：锁定段禁止，且不允许与邻段重叠
    retimeSegment(id: string, start: number, end: number) {
      const segment = this.requireSegment(id)
      assertSegmentUnlocked(segment)
      if (overlapsExisting(this.project.segments, start, end, id)) return
      segment.start = clamp(start, 0, this.project.duration)
      segment.end = clamp(end, segment.start + 0.1, this.project.duration)
    },

    toggleLock(id: string) {
      const segment = this.requireSegment(id)
      segment.locked = !segment.locked
      if (segment.locked) this.selectedKeyframeId = null
    },

    removeSegment(id: string) {
      const segment = this.requireSegment(id)
      assertSegmentUnlocked(segment)
      this.project.segments = this.project.segments.filter((s) => s.id !== id)
      if (this.selectedSegmentId === id) this.selectedSegmentId = null
    },

    // ---------- 关键帧（全部过锁定守卫） ----------
    addKeyframe(segmentId: string, track: TrackKey, time: number, value?: number) {
      const segment = this.requireSegment(segmentId)
      assertSegmentUnlocked(segment)
      const safeValue = value ?? evaluateAt(this.project, time)[track]
      const frame = {
        id: uid('kf'),
        time: clamp(time, segment.start, segment.end),
        value: safeValue,
        easing: 'linear' as EasingType,
      }
      segment.keyframes[track] = upsertKeyframe(segment.keyframes[track], frame)
      this.selectedKeyframeId = frame.id
      return frame
    },

    updateKeyframeValue(segmentId: string, track: TrackKey, keyframeId: string, value: number) {
      const segment = this.requireSegment(segmentId)
      assertSegmentUnlocked(segment)
      const frame = segment.keyframes[track].find((k) => k.id === keyframeId)
      if (frame) frame.value = value
    },

    moveKeyframe(segmentId: string, track: TrackKey, keyframeId: string, time: number) {
      const segment = this.requireSegment(segmentId)
      assertSegmentUnlocked(segment)
      const frames = segment.keyframes[track]
      const index = frames.findIndex((k) => k.id === keyframeId)
      if (index < 0) return
      const prev = frames[index - 1]?.time ?? segment.start
      const next = frames[index + 1]?.time ?? segment.end
      frames[index].time = clamp(time, prev, next)
      frames.sort((a, b) => a.time - b.time)
    },

    removeKeyframe(segmentId: string, track: TrackKey, keyframeId: string) {
      const segment = this.requireSegment(segmentId)
      assertSegmentUnlocked(segment)
      segment.keyframes[track] = removeKeyframe(segment.keyframes[track], keyframeId)
      if (this.selectedKeyframeId === keyframeId) this.selectedKeyframeId = null
    },

    setKeyframeEasing(segmentId: string, track: TrackKey, keyframeId: string, easing: EasingType) {
      const segment = this.requireSegment(segmentId)
      assertSegmentUnlocked(segment)
      const frame = segment.keyframes[track].find((k) => k.id === keyframeId)
      if (frame) frame.easing = easing
    },

    // ---------- 特效（独立分路，不经过关键帧守卫，锁定态可编辑） ----------
    setEffect(segmentId: string, key: EffectKey, value: number) {
      const segment = this.requireSegment(segmentId)
      const spec = EFFECT_SPEC[key]
      segment.effects[key] = clamp(value, spec.min, spec.max)
    },

    resetEffects(segmentId: string) {
      const segment = this.requireSegment(segmentId)
      segment.effects = { ...NEUTRAL_EFFECTS }
    },

    requireSegment(id: string): Segment {
      const segment = this.project.segments.find((s) => s.id === id)
      if (!segment) throw new Error(`段 ${id} 不存在`)
      return segment
    },
  },
})
