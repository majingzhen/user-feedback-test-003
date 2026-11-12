<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Lock, Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-vue-next'

import IconButton from '@/components/common/IconButton.vue'
import KeyframeDiamond from '@/components/timeline/KeyframeDiamond.vue'
import Playhead from '@/components/timeline/Playhead.vue'
import TimelineRuler from '@/components/timeline/TimelineRuler.vue'
import { useTimeline } from '@/composables/useTimeline'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'
import { useToastStore } from '@/stores/toast'
import type { Segment, TrackKey } from '@/types/project'
import { TRACK_KEYS, TRACK_LABELS } from '@/types/project'

const projectStore = useProjectStore()
const playerStore = usePlayerStore()
const toastStore = useToastStore()
const { totalWidth, timeToX, clampTime, formatTime } = useTimeline()

const scrollRef = ref<HTMLDivElement | null>(null)
const newSegmentDuration = 3

const segments = computed(() => projectStore.segments)

const addSegment = () => {
  const start = clampTime(playerStore.currentTime)
  const segment = projectStore.addSegment(start, Math.min(start + newSegmentDuration, projectStore.duration))
  if (!segment) toastStore.show('段区间重叠，换个时间试试')
}

const selectSegment = (segment: Segment) => projectStore.selectSegment(segment.id)

const onLaneClick = (event: MouseEvent, segment: Segment, track: TrackKey) => {
  if (segment.locked) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const time = clampTime(segment.start + (event.clientX - rect.left) / (timeToX(1) || 1))
  if (time < segment.start || time > segment.end) return
  try {
    projectStore.addKeyframe(segment.id, track, time)
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '操作失败')
  }
}

const moveFrame = (segment: Segment, track: TrackKey, frameId: string, time: number) => {
  try {
    projectStore.moveKeyframe(segment.id, track, frameId, clampTime(time))
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '操作失败')
  }
}

const removeSelectedFrame = () => {
  const segment = projectStore.selectedSegment
  if (!segment || segment.locked || !projectStore.selectedKeyframeId) return
  for (const track of TRACK_KEYS) {
    if (segment.keyframes[track].some((kf) => kf.id === projectStore.selectedKeyframeId)) {
      projectStore.removeKeyframe(segment.id, track, projectStore.selectedKeyframeId)
      return
    }
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === 'Delete' || event.key === 'Backspace') removeSelectedFrame()
}

const zoom = (direction: 1 | -1) => {
  const next = playerStore.pixelsPerSecond * (direction > 0 ? 1.25 : 0.8)
  playerStore.setPixelsPerSecond(
    Math.min(240, Math.max(8, next)),
  )
}

const onWheel = (event: WheelEvent) => {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  zoom(event.deltaY < 0 ? 1 : -1)
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="timeline">
    <div class="timeline__toolbar">
      <IconButton
        :icon="Plus"
        label="新建段"
        :disabled="!projectStore.hasVideo || playerStore.exporting"
        @click="addSegment"
      />
      <IconButton
        :icon="Trash2"
        label="删除段"
        :disabled="!projectStore.selectedSegment || projectStore.selectedSegment.locked || playerStore.exporting"
        @click="projectStore.selectedSegment && projectStore.removeSegment(projectStore.selectedSegment.id)"
      />
      <div class="timeline__zoom">
        <IconButton :icon="ZoomOut" variant="ghost" title="缩小时间轴" @click="zoom(-1)" />
        <IconButton :icon="ZoomIn" variant="ghost" title="放大时间轴" @click="zoom(1)" />
      </div>
      <span class="timeline__time">{{ formatTime(playerStore.currentTime) }} / {{ formatTime(projectStore.duration) }}</span>
      <span class="timeline__hint">点击轨道空白处打帧 · 拖动菱形改时间 · Delete 删帧 · Ctrl+滚轮缩放</span>
    </div>

    <div ref="scrollRef" class="timeline__scroll" @wheel="onWheel">
      <div class="timeline__canvas" :style="{ width: `${totalWidth}px` }">
        <TimelineRuler @scrub="(t) => playerStore.setCurrentTime(clampTime(t))" />

        <div class="lane lane--segments">
          <div class="lane__label">段</div>
          <div class="lane__track">
            <div
              v-for="segment in segments"
              :key="segment.id"
              class="segment-block"
              :class="{
                'segment-block--selected': segment.id === projectStore.selectedSegmentId,
                'segment-block--locked': segment.locked,
              }"
              :style="{ left: `${timeToX(segment.start)}px`, width: `${timeToX(segment.end - segment.start)}px` }"
              @click.stop="selectSegment(segment)"
            >
              <Lock v-if="segment.locked" :size="12" :stroke-width="1.75" />
              <span>{{ formatTime(segment.start) }} - {{ formatTime(segment.end) }}</span>
            </div>
          </div>
        </div>

        <div v-for="track in TRACK_KEYS" :key="track" class="lane">
          <div class="lane__label">{{ TRACK_LABELS[track] }}</div>
          <div class="lane__track">
            <template v-for="segment in segments" :key="segment.id">
              <div
                class="segment-region"
                :class="{ 'segment-region--selected': segment.id === projectStore.selectedSegmentId }"
                :style="{ left: `${timeToX(segment.start)}px`, width: `${timeToX(segment.end - segment.start)}px` }"
                @click="onLaneClick($event, segment, track)"
              />
              <KeyframeDiamond
                v-for="frame in segment.keyframes[track]"
                :key="frame.id"
                :frame="frame"
                :selected="frame.id === projectStore.selectedKeyframeId"
                :disabled="segment.locked"
                @select="projectStore.selectedKeyframeId = $event"
                @move="(id, time) => moveFrame(segment, track, id, time)"
              />
            </template>
          </div>
        </div>

        <Playhead />
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  height: 240px;
  background: var(--color-slate-900);
  border-top: 1px solid var(--color-slate-800);
}
.timeline__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-4);
  border-bottom: 1px solid var(--color-slate-800);
  flex-shrink: 0;
}
.timeline__zoom {
  display: flex;
  gap: var(--spacing-1);
}
.timeline__time {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--color-slate-300);
}
.timeline__hint {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-slate-500);
}
.timeline__scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}
.timeline__canvas {
  position: relative;
  min-width: 100%;
}
.lane {
  display: flex;
  height: 36px;
  border-bottom: 1px solid var(--color-slate-850);
}
.lane__label {
  position: sticky;
  left: 0;
  z-index: 10;
  width: 88px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-3);
  background: var(--color-slate-900);
  border-right: 1px solid var(--color-slate-800);
  font-size: var(--text-xs);
  color: var(--color-slate-400);
}
.lane__track {
  position: relative;
  flex: 1;
}
.segment-block {
  position: absolute;
  top: 4px;
  bottom: 4px;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0 var(--spacing-2);
  background: color-mix(in srgb, var(--color-primary-500) 22%, var(--color-slate-800));
  border: 1px solid var(--color-slate-600);
  border-radius: var(--radius-sm);
  color: var(--color-slate-200);
  font-size: var(--text-xs);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  transition: border-color var(--animate-fast);
}
.segment-block--selected {
  border-color: var(--color-primary-500);
}
.segment-block--locked {
  background: var(--color-slate-800);
  border-color: var(--color-slate-700);
  color: var(--color-slate-400);
}
.segment-region {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px dashed var(--color-slate-800);
  cursor: copy;
}
.segment-region--selected {
  background: color-mix(in srgb, var(--color-primary-500) 6%, transparent);
}
</style>
