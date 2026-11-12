<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppTopBar from '@/components/layout/AppTopBar.vue'
import RestoreDialog from '@/components/layout/RestoreDialog.vue'
import TransportBar from '@/components/layout/TransportBar.vue'
import ToastHost from '@/components/common/ToastHost.vue'
import SidePanel from '@/components/panels/SidePanel.vue'
import VideoCanvas from '@/components/preview/VideoCanvas.vue'
import TimelineEditor from '@/components/timeline/TimelineEditor.vue'
import { useExporter } from '@/composables/useExporter'
import { usePlayer } from '@/composables/usePlayer'
import { usePersistence } from '@/composables/usePersistence'
import { useRenderer } from '@/composables/useRenderer'
import { useSettingsStore } from '@/stores/settings'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const settingsStore = useSettingsStore()
const { listRestorable } = usePersistence()

// renderer 在 App 层创建，预览与导出共用同一实例
const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderer = useRenderer(canvasRef)
const videoCanvas = ref<InstanceType<typeof VideoCanvas> | null>(null)
const getVideo = (): HTMLVideoElement | null => videoCanvas.value?.videoElementRef ?? null
const exporter = useExporter(renderer)

const { toggle, stepFrame } = usePlayer(getVideo)
const showRestore = ref(false)

const onKeyDown = (event: KeyboardEvent) => {
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.code === 'Space') {
    event.preventDefault()
    toggle()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    stepFrame(-1, settingsStore.exportFps)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    stepFrame(1, settingsStore.exportFps)
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  const restorable = await listRestorable()
  if (restorable.length > 0) showRestore.value = true
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

const onRestored = () => {
  showRestore.value = false
  const video = getVideo()
  if (video) video.loop = playerStore.loop
}
</script>

<template>
  <div class="app-shell">
    <AppTopBar :exporter="exporter" :get-video="getVideo" />

    <main class="app-shell__main">
      <div class="app-shell__workspace">
        <VideoCanvas ref="videoCanvas" :canvas-ref="canvasRef" :renderer="renderer" />
        <TransportBar :get-video="getVideo" />
      </div>
      <SidePanel />
    </main>

    <TimelineEditor />

    <ToastHost />
    <RestoreDialog v-if="showRestore" @restored="onRestored" @dismissed="showRestore = false" />
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.app-shell__main {
  flex: 1;
  min-height: 0;
  display: flex;
}
.app-shell__workspace {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
}
</style>
