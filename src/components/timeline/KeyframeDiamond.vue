<script setup lang="ts">
import { computed } from 'vue'

import { useTimeline } from '@/composables/useTimeline'
import type { Keyframe } from '@/types/project'

const props = defineProps<{
  frame: Keyframe
  selected: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  move: [id: string, time: number]
}>()

const { timeToX } = useTimeline()

const left = computed(() => timeToX(props.frame.time))

const onPointerDown = (event: MouseEvent) => {
  if (props.disabled) return
  event.stopPropagation()
  emit('select', props.frame.id)
  const startX = event.clientX
  const startTime = props.frame.time
  const move = (moveEvent: MouseEvent) => {
    const deltaTime = (moveEvent.clientX - startX) / (timeToX(1) || 1)
    emit('move', props.frame.id, startTime + deltaTime)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
</script>

<template>
  <button
    class="diamond"
    :class="{ 'diamond--selected': selected, 'diamond--disabled': disabled }"
    :style="{ left: `${left}px` }"
    :title="`t=${frame.time.toFixed(2)}s, v=${frame.value}`"
    @pointerdown="onPointerDown"
  >
    <span class="diamond__shape" />
  </button>
</template>

<style scoped>
.diamond {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: grab;
  z-index: 2;
}
.diamond__shape {
  display: block;
  width: 11px;
  height: 11px;
  margin: 0 auto;
  background: var(--color-slate-400);
  border: 1.5px solid var(--color-slate-200);
  transform: rotate(45deg);
  transition: background var(--animate-fast), border-color var(--animate-fast);
}
.diamond--selected .diamond__shape {
  background: var(--color-primary-500);
  border-color: var(--color-primary-400);
}
.diamond--disabled {
  cursor: not-allowed;
}
.diamond--disabled .diamond__shape {
  background: var(--color-slate-700);
  border-color: var(--color-slate-600);
}
</style>
