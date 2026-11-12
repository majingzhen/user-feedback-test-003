<script setup lang="ts">
import { computed } from 'vue'
import { Diamond, Lock, Trash2 } from 'lucide-vue-next'

import NumberField from '@/components/common/NumberField.vue'
import SliderRow from '@/components/common/SliderRow.vue'
import { evaluateAt } from '@/core/evaluate'
import { SegmentLockedError } from '@/core/schema'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'
import { useToastStore } from '@/stores/toast'
import type { TrackKey } from '@/types/project'
import { TRACK_KEYS, TRACK_LABELS } from '@/types/project'

const projectStore = useProjectStore()
const playerStore = usePlayerStore()
const toastStore = useToastStore()

const segment = computed(() => projectStore.selectedSegment)
const locked = computed(() => segment.value?.locked === true)

// 统一承接锁定守卫抛出的错误
const guard = (action: () => void) => {
  try {
    action()
  } catch (error) {
    if (error instanceof SegmentLockedError) toastStore.show('该段已锁定，关键帧只读')
    else throw error
  }
}

const currentFrame = computed(() => evaluateAt(projectStore.project, playerStore.currentTime))

const trackSpec: Record<TrackKey, { min: number; max: number; step: number; unit: string }> = {
  x: { min: -960, max: 960, step: 1, unit: 'px' },
  y: { min: -540, max: 540, step: 1, unit: 'px' },
  scale: { min: 0.1, max: 4, step: 0.01, unit: '' },
  opacity: { min: 0, max: 1, step: 0.01, unit: '' },
}

// 当前时刻所在轨道是否恰好有关键帧（eps 内）
const frameAtPlayhead = (track: TrackKey) => {
  if (!segment.value) return null
  const t = playerStore.currentTime
  return (
    segment.value.keyframes[track].find((kf) => Math.abs(kf.time - t) <= 1 / 30000) ?? null
  )
}

const addFrame = (track: TrackKey) => {
  if (!segment.value || locked.value) return
  guard(() => projectStore.addKeyframe(segment.value!.id, track, playerStore.currentTime))
}

const removeFrame = (track: TrackKey) => {
  const frame = frameAtPlayhead(track)
  if (!segment.value || !frame || locked.value) return
  guard(() => projectStore.removeKeyframe(segment.value!.id, track, frame.id))
}

const updateValue = (track: TrackKey, value: number) => {
  const frame = frameAtPlayhead(track)
  if (!segment.value || !frame || locked.value) return
  guard(() => projectStore.updateKeyframeValue(segment.value!.id, track, frame.id, value))
}

const toggleEasing = (track: TrackKey) => {
  const frame = frameAtPlayhead(track)
  if (!segment.value || !frame || locked.value) return
  guard(() =>
    projectStore.setKeyframeEasing(
      segment.value!.id,
      track,
      frame.id,
      frame.easing === 'linear' ? 'easeInOut' : 'linear',
    ),
  )
}
</script>

<template>
  <div class="panel">
    <template v-if="segment">
      <div class="panel__head">
        <span class="panel__title">变换关键帧</span>
        <span v-if="locked" class="panel__lock-hint">
          <Lock :size="13" :stroke-width="1.75" /> 只读
        </span>
      </div>

      <div v-for="track in TRACK_KEYS" :key="track" class="track-row">
        <div class="track-row__head">
          <span class="track-row__name">{{ TRACK_LABELS[track] }}</span>
          <div class="track-row__actions">
            <NumberField
              :model-value="currentFrame[track]"
              :min="trackSpec[track].min"
              :max="trackSpec[track].max"
              :step="trackSpec[track].step"
              :disabled="locked || !frameAtPlayhead(track)"
              @update:model-value="updateValue(track, $event)"
            />
            <button
              class="diamond-btn"
              :class="{ 'diamond-btn--active': !!frameAtPlayhead(track), 'is-disabled': locked }"
              :title="frameAtPlayhead(track) ? '当前时刻已有关键帧' : '在播放头处打帧'"
              @click="addFrame(track)"
            >
              <Diamond :size="15" :stroke-width="1.75" />
            </button>
            <button
              v-if="frameAtPlayhead(track)"
              class="ghost-btn"
              :disabled="locked"
              title="删除该帧"
              @click="removeFrame(track)"
            >
              <Trash2 :size="14" :stroke-width="1.75" />
            </button>
          </div>
        </div>
        <SliderRow
          :label="`当前值（仅在有关键帧时可编辑）`"
          :model-value="currentFrame[track]"
          :min="trackSpec[track].min"
          :max="trackSpec[track].max"
          :step="trackSpec[track].step"
          :unit="trackSpec[track].unit"
          :disabled="locked || !frameAtPlayhead(track)"
          @update:model-value="updateValue(track, $event)"
        />
        <button
          v-if="frameAtPlayhead(track)"
          class="easing-btn"
          :disabled="locked"
          @click="toggleEasing(track)"
        >
          缓动：{{ frameAtPlayhead(track)?.easing === 'linear' ? '线性 linear' : '缓入缓出 easeInOut' }}
        </button>
      </div>
    </template>

    <div v-else class="panel__empty">
      <Diamond :size="28" :stroke-width="1.5" />
      <p>在时间线上选择一个段后，才能添加位置、缩放与透明度关键帧</p>
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel__title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
}
.panel__lock-hint {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-primary-400);
}
.track-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--color-slate-850);
  border: 1px solid var(--color-slate-800);
  border-radius: var(--radius);
}
.track-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.track-row__name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
}
.track-row__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
.diamond-btn {
  display: inline-flex;
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-slate-500);
  cursor: pointer;
  transition: color var(--animate-fast), background var(--animate-fast);
}
.diamond-btn:hover:not(.is-disabled) {
  color: var(--color-slate-200);
  background: var(--color-slate-800);
}
.diamond-btn--active {
  color: var(--color-primary-400);
  fill: var(--color-primary-500);
}
.diamond-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ghost-btn {
  display: inline-flex;
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-slate-500);
  cursor: pointer;
}
.ghost-btn:hover:not(:disabled) {
  color: var(--color-danger-500);
}
.ghost-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.easing-btn {
  align-self: flex-start;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-slate-800);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-sm);
  color: var(--color-slate-300);
  font-size: var(--text-xs);
  cursor: pointer;
}
.easing-btn:hover:not(:disabled) {
  border-color: var(--color-slate-500);
}
.easing-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6) var(--spacing-4);
  color: var(--color-slate-500);
  text-align: center;
  font-size: var(--text-xs);
}
</style>
