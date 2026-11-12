import { ref, toRaw } from 'vue'

import { downloadBlob, probeWebmMimeType } from '@/core/exporter/mimeType'
import { realtimeExporter } from '@/core/exporter/realtimeExporter'
import type { ExporterProgress } from '@/core/exporter/types'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import type { useRenderer } from '@/composables/useRenderer'

// 导出编排：定格快照 → 切换导出分辨率 → 实时录制 → 恢复预览
export const useExporter = (renderer: ReturnType<typeof useRenderer>) => {
  const projectStore = useProjectStore()
  const settingsStore = useSettingsStore()
  const playerStore = usePlayerStore()
  const toastStore = useToastStore()

  const exporting = ref(false)
  const progress = ref<ExporterProgress | null>(null)
  const frameDropRatio = ref(0)
  let abortController: AbortController | null = null

  const canExport = (): boolean =>
    projectStore.hasVideo && probeWebmMimeType() !== null && renderer.filterSupported

  const exportVideo = async (video: HTMLVideoElement) => {
    if (exporting.value || !projectStore.project.videoMeta) return
    const canvas = renderer.getCanvas()
    if (!canvas) return

    exporting.value = true
    playerStore.setExporting(true)
    frameDropRatio.value = 0
    abortController = new AbortController()

    // 定格快照，录制期间编辑不污染结果
    renderer.syncSnapshot()
    const snapshotProject = toRaw(projectStore.project)
    renderer.setExportBacking(
      snapshotProject.canvas.exportWidth,
      snapshotProject.canvas.exportHeight,
    )
    renderer.drawOnce(video.currentTime)

    try {
      const result = await realtimeExporter.exportVideo({
        canvas,
        video,
        fps: settingsStore.exportFps,
        bitrate: settingsStore.exportBitrate,
        duration: projectStore.duration,
        onProgress: (p) => {
          progress.value = p
        },
        signal: abortController.signal,
      })
      frameDropRatio.value = result.frameDropRatio
      const fileName = `${projectStore.project.name || 'export'}.webm`
      downloadBlob(result.blob, fileName)
      if (result.frameDropRatio > 0.02) {
        toastStore.show(`导出完成，但检测到 ${(result.frameDropRatio * 100).toFixed(1)}% 帧偏差，建议降低模糊强度或导出分辨率后重试`)
      } else {
        toastStore.show('导出完成，WebM 已开始下载')
      }
    } catch (error) {
      // 用户主动取消不算错误，其余静默留给状态复位
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('导出失败', error)
      }
    } finally {
      exporting.value = false
      playerStore.setExporting(false)
      progress.value = null
      renderer.restorePreviewBacking()
    }
  }

  const cancel = () => abortController?.abort()

  return { exporting, progress, frameDropRatio, canExport, exportVideo, cancel }
}
