<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { AlertTriangle, Film } from 'lucide-vue-next'

import { usePlayer } from '@/composables/usePlayer'
import type { useRenderer } from '@/composables/useRenderer'
import { useProjectStore } from '@/stores/project'

const props = defineProps<{
  canvasRef: Ref<HTMLCanvasElement | null>
  renderer: ReturnType<typeof useRenderer>
}>()

const projectStore = useProjectStore()
const videoElementRef = ref<HTMLVideoElement | null>(null)

// 把 canvas 元素透传给父级持有的 ref
const setCanvas = (el: Element | unknown) => {
  props.canvasRef.value = (el as HTMLCanvasElement | null) ?? null
}

// 恢复工程后视频 URL 变化时，等元数据就绪再重建快照与画布尺寸
watch(
  () => projectStore.videoUrl,
  (url) => {
    if (!url) return
    props.renderer.syncSnapshot()
  },
)

const { toggle, seek, onPlayEvent, onPauseEvent, onTimeUpdate } = usePlayer(
  () => videoElementRef.value,
)

// 工程变更后同步渲染快照，并触发防抖自动保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => projectStore.project,
  () => {
    props.renderer.syncSnapshot()
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void projectStore.persist()
    }, 1500)
  },
  { deep: true },
)

const onLoadedMetadata = () => {
  props.renderer.resizeCanvas()
  props.renderer.syncSnapshot()
}

// 双击在画布上按横向比例 scrub
const onScrub = (event: MouseEvent) => {
  if (!videoElementRef.value || !projectStore.hasVideo) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  seek(ratio * projectStore.duration)
}

onMounted(() => {
  if (!videoElementRef.value) return
  const video = videoElementRef.value
  video.addEventListener('play', onPlayEvent)
  video.addEventListener('pause', onPauseEvent)
  video.addEventListener('timeupdate', onTimeUpdate)
  props.renderer.mount(video)
})

onBeforeUnmount(() => {
  const video = videoElementRef.value
  video?.removeEventListener('play', onPlayEvent)
  video?.removeEventListener('pause', onPauseEvent)
  video?.removeEventListener('timeupdate', onTimeUpdate)
  if (saveTimer) clearTimeout(saveTimer)
  projectStore.revokeVideoUrl()
})

defineExpose({ videoElementRef })
</script>

<template>
  <div class="preview">
    <video
      ref="videoElementRef"
      class="preview__video"
      :src="projectStore.videoUrl ?? undefined"
      preload="auto"
      playsinline
      @loadedmetadata="onLoadedMetadata"
    />
    <div v-if="projectStore.hasVideo" class="preview__stage" @click="toggle" @dblclick="onScrub">
      <canvas :ref="setCanvas" class="preview__canvas" />
      <div v-if="!renderer.filterSupported" class="preview__warning">
        <AlertTriangle :size="16" :stroke-width="1.75" />
        <span>当前浏览器不支持画布滤镜，导出将缺少画面特效，请使用 Chrome 或 Edge</span>
      </div>
    </div>
    <div v-else class="preview__empty">
      <Film :size="40" :stroke-width="1.5" />
      <p class="preview__empty-title">还没有视频</p>
      <p class="preview__empty-sub">从左上角导入一个本地视频开始创作</p>
    </div>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  background: var(--color-slate-950);
}
.preview__video {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.preview__stage {
  position: relative;
  flex: 1;
  margin: var(--spacing-4);
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
  cursor: pointer;
}
.preview__canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.preview__warning {
  position: absolute;
  top: var(--spacing-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: color-mix(in srgb, var(--color-warning-500) 16%, var(--color-slate-900));
  border: 1px solid var(--color-warning-500);
  border-radius: var(--radius-sm);
  color: var(--color-warning-500);
  font-size: var(--text-xs);
  white-space: nowrap;
}
.preview__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  color: var(--color-slate-600);
}
.preview__empty-title {
  margin: var(--spacing-3) 0 0;
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-slate-400);
}
.preview__empty-sub {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-slate-500);
}
</style>
