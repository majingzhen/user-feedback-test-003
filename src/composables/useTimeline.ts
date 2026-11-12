import { computed } from 'vue'

import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'

// 时间坐标 <-> 像素 的唯一换算入口
export const useTimeline = () => {
  const playerStore = usePlayerStore()
  const projectStore = useProjectStore()

  const pixelsPerSecond = computed(() => playerStore.pixelsPerSecond)
  const totalWidth = computed(() => Math.max(1, projectStore.duration * pixelsPerSecond.value))

  const timeToX = (time: number): number => time * pixelsPerSecond.value
  const xToTime = (x: number): number => Math.max(0, x / pixelsPerSecond.value)

  const clampTime = (time: number): number =>
    Math.min(Math.max(0, time), projectStore.duration)

  // 标尺刻度：随缩放自适应 1/2/5/10/30 秒间隔
  const tickInterval = computed(() => {
    const pps = pixelsPerSecond.value
    const candidates = [1, 2, 5, 10, 30, 60]
    return candidates.find((seconds) => seconds * pps >= 80) ?? 60
  })

  const ticks = computed(() => {
    const result: number[] = []
    for (let t = 0; t <= projectStore.duration; t += tickInterval.value) {
      result.push(t)
    }
    return result
  })

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`
  }

  return { pixelsPerSecond, totalWidth, timeToX, xToTime, clampTime, tickInterval, ticks, formatTime }
}
