import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'

// 播放控制：所有 seek 走单一入口，video 元素由调用方持有
export const usePlayer = (video: () => HTMLVideoElement | null) => {
  const playerStore = usePlayerStore()
  const projectStore = useProjectStore()

  const play = async () => {
    const element = video()
    if (!element || !projectStore.hasVideo) return
    try {
      await element.play()
      playerStore.setPlaying(true)
    } catch {
      playerStore.setPlaying(false)
    }
  }

  const pause = () => {
    video()?.pause()
    playerStore.setPlaying(false)
  }

  const toggle = () => (playerStore.playing ? pause() : play())

  const seek = (time: number) => {
    const element = video()
    if (!element) return
    const clamped = Math.min(Math.max(0, time), projectStore.duration)
    element.currentTime = clamped
    playerStore.setCurrentTime(clamped)
  }

  // 步进一帧，按导出 fps 的粒度
  const stepFrame = (direction: 1 | -1, fps = 30) => {
    const element = video()
    if (!element) return
    pause()
    seek(element.currentTime + direction / fps)
  }

  const onPlayEvent = () => playerStore.setPlaying(true)
  const onPauseEvent = () => playerStore.setPlaying(false)
  const onTimeUpdate = () => {
    const element = video()
    if (element) playerStore.setCurrentTime(element.currentTime)
  }

  return { play, pause, toggle, seek, stepFrame, onPlayEvent, onPauseEvent, onTimeUpdate }
}
