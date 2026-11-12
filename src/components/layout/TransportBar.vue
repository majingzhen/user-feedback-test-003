<script setup lang="ts">
import { Pause, Play, Repeat, SkipBack, SkipForward } from 'lucide-vue-next'

import IconButton from '@/components/common/IconButton.vue'
import { usePlayer } from '@/composables/usePlayer'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'

const props = defineProps<{
  getVideo: () => HTMLVideoElement | null
}>()

const playerStore = usePlayerStore()
const projectStore = useProjectStore()
const { toggle, seek } = usePlayer(props.getVideo)

const skip = (direction: 1 | -1) => {
  const video = props.getVideo()
  if (!video) return
  seek(video.currentTime + direction * 5)
}

const toggleLoop = () => {
  playerStore.toggleLoop()
  const video = props.getVideo()
  if (video) video.loop = playerStore.loop
}
</script>

<template>
  <div class="transport">
    <IconButton
      :icon="SkipBack"
      variant="ghost"
      :disabled="!projectStore.hasVideo"
      title="后退 5 秒"
      @click="skip(-1)"
    />
    <IconButton
      :icon="playerStore.playing ? Pause : Play"
      variant="default"
      :disabled="!projectStore.hasVideo"
      :title="playerStore.playing ? '暂停（空格）' : '播放（空格）'"
      @click="toggle()"
    />
    <IconButton
      :icon="SkipForward"
      variant="ghost"
      :disabled="!projectStore.hasVideo"
      title="前进 5 秒"
      @click="skip(1)"
    />
    <IconButton
      :icon="Repeat"
      variant="ghost"
      :disabled="!projectStore.hasVideo"
      :title="playerStore.loop ? '关闭循环' : '循环播放'"
      @click="toggleLoop"
    />
    <span class="transport__hint">空格播放/暂停 · 方向键逐帧</span>
    <button
      v-if="projectStore.storageDegraded"
      class="transport__warning"
      title="视频过大未存入浏览器，刷新后需重新选择源视频，关键帧配置不会丢失"
    >
      大文件模式：刷新后需重选源视频
    </button>
  </div>
</template>

<style scoped>
.transport {
  position: absolute;
  left: 50%;
  bottom: var(--spacing-5);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: color-mix(in srgb, var(--color-slate-900) 88%, transparent);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  z-index: 30;
}
.transport__hint {
  font-size: var(--text-xs);
  color: var(--color-slate-500);
  padding-left: var(--spacing-2);
}
.transport__warning {
  margin-left: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-2);
  background: color-mix(in srgb, var(--color-warning-500) 14%, transparent);
  border: 1px solid var(--color-warning-500);
  border-radius: var(--radius-sm);
  color: var(--color-warning-500);
  font-size: var(--text-xs);
}
</style>
