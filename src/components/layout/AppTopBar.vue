<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, RefreshCw, Upload } from 'lucide-vue-next'

import IconButton from '@/components/common/IconButton.vue'
import type { useExporter } from '@/composables/useExporter'
import { useProjectStore } from '@/stores/project'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  exporter: ReturnType<typeof useExporter>
  getVideo: () => HTMLVideoElement | null
}>()

const projectStore = useProjectStore()
const toastStore = useToastStore()
const fileInput = ref<HTMLInputElement | null>(null)
const relinkInput = ref<HTMLInputElement | null>(null)

const showToast = (message: string) => toastStore.show(message)

const saveLabel = computed(() => {
  switch (projectStore.saveState) {
    case 'saving':
      return '保存中…'
    case 'saved':
      return '已自动保存'
    case 'error':
      return '保存失败'
    default:
      return ''
  }
})

const probeVideo = (file: File): Promise<{ duration: number; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight })
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该视频文件'))
    }
    video.src = url
  })

const onImport = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const meta = await probeVideo(file)
    await projectStore.importVideo(file, meta.duration, meta.width, meta.height)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '导入失败')
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}

const onRelink = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ok = await projectStore.relinkVideo(file)
  showToast(ok ? '源视频已重新关联' : '文件与工程记录不一致，请选择原来的视频')
  ;(event.target as HTMLInputElement).value = ''
}

const onExport = () => {
  const video = props.getVideo()
  if (video) void props.exporter.exportVideo(video)
}

const progressPercent = computed(() => {
  const p = props.exporter.progress.value
  if (!p || p.duration === 0) return 0
  return Math.round((p.elapsed / p.duration) * 100)
})
</script>

<template>
  <header class="topbar">
    <div class="topbar__group">
      <h1 class="topbar__title">关键帧视频工具</h1>
      <span v-if="projectStore.hasVideo" class="topbar__project">{{ projectStore.project.name }}</span>
    </div>

    <div class="topbar__group">
      <input ref="fileInput" type="file" accept="video/*" hidden @change="onImport" />
      <IconButton :icon="Upload" label="导入视频" @click="fileInput?.click()" />

      <input ref="relinkInput" type="file" accept="video/*" hidden @change="onRelink" />
      <IconButton
        v-if="projectStore.hasVideo && projectStore.storageDegraded"
        :icon="RefreshCw"
        label="重选源视频"
        variant="ghost"
        @click="relinkInput?.click()"
      />

      <span v-if="saveLabel" class="topbar__save" :class="`topbar__save--${projectStore.saveState}`">
        {{ saveLabel }}
      </span>

      <IconButton
        :icon="Download"
        :label="exporter.exporting.value ? `导出中 ${progressPercent}%` : '导出 WebM'"
        variant="primary"
        :disabled="!exporter.canExport() || exporter.exporting.value"
        @click="onExport"
      />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: relative;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
  background: var(--color-slate-900);
  border-bottom: 1px solid var(--color-slate-800);
}
.topbar__group {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}
.topbar__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
}
.topbar__project {
  padding-left: var(--spacing-3);
  border-left: 1px solid var(--color-slate-700);
  font-size: var(--text-xs);
  color: var(--color-slate-400);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topbar__save {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
}
.topbar__save--saved {
  color: var(--color-success-500);
}
.topbar__save--saving {
  color: var(--color-slate-400);
}
.topbar__save--error {
  color: var(--color-danger-500);
}
</style>
