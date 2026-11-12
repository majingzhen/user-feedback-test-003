import { defineStore } from 'pinia'

interface ToastState {
  message: string
  timer: ReturnType<typeof setTimeout> | null
}

// 全局轻提示，替代无人监听的 CustomEvent
export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({ message: '', timer: null }),

  actions: {
    show(message: string, duration = 2600) {
      this.message = message
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.message = ''
        this.timer = null
      }, duration)
    },
    dismiss() {
      this.message = ''
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
  },
})
