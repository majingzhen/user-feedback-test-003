import { defineStore } from 'pinia'

interface PlayerState {
  // 低频播放态
  playing: boolean
  // 播放头秒数，rAF 以 50ms 节流回写，不进渲染热路径
  currentTime: number
  // 时间线缩放：每秒对应像素
  pixelsPerSecond: number
  loop: boolean
  // 导出录制期间为 true，编辑入口统一禁用
  exporting: boolean
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    playing: false,
    currentTime: 0,
    pixelsPerSecond: 60,
    loop: false,
    exporting: false,
  }),

  actions: {
    setPlaying(playing: boolean) {
      this.playing = playing
    },
    setCurrentTime(time: number) {
      this.currentTime = time
    },
    setPixelsPerSecond(value: number) {
      this.pixelsPerSecond = value
    },
    toggleLoop() {
      this.loop = !this.loop
    },
    setExporting(value: boolean) {
      this.exporting = value
    },
  },
})
