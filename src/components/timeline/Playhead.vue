<script setup lang="ts">
import { computed } from 'vue'

import { useTimeline } from '@/composables/useTimeline'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const { timeToX } = useTimeline()

const left = computed(() => timeToX(playerStore.currentTime))
</script>

<template>
  <div class="playhead" :style="{ transform: `translate3d(${left}px, 0, 0)` }">
    <div class="playhead__line" />
    <div class="playhead__cap" />
  </div>
</template>

<style scoped>
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  z-index: 20;
  pointer-events: none;
  will-change: transform;
}
.playhead__line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--color-primary-400);
}
.playhead__cap {
  position: absolute;
  top: 0;
  left: -5px;
  width: 12px;
  height: 8px;
  background: var(--color-primary-400);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
</style>
