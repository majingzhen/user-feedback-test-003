<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline'

const { totalWidth, timeToX, ticks, formatTime, xToTime } = useTimeline()

const emit = defineEmits<{ scrub: [time: number] }>()

const onPointerDown = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const move = (moveEvent: MouseEvent) => {
    const rect = target.getBoundingClientRect()
    emit('scrub', xToTime(moveEvent.clientX - rect.left))
  }
  move(event)
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<template>
  <div class="ruler" :style="{ width: `${totalWidth}px` }" @pointerdown="onPointerDown">
    <div
      v-for="tick in ticks"
      :key="tick"
      class="ruler__tick"
      :style="{ left: `${timeToX(tick)}px` }"
    >
      <span class="ruler__label">{{ formatTime(tick) }}</span>
    </div>
  </div>
</template>

<style scoped>
.ruler {
  position: relative;
  height: 32px;
  flex-shrink: 0;
  background: var(--color-slate-900);
  border-bottom: 1px solid var(--color-slate-800);
  cursor: ew-resize;
  user-select: none;
}
.ruler__tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-slate-700);
}
.ruler__label {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-slate-400);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
