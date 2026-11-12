import { defineStore } from 'pinia'

interface SettingsState {
  exportFps: number
  exportBitrate: number
}

const STORAGE_KEY = 'kvt_settings'

const load = (): SettingsState => {
  const fallback: SettingsState = { exportFps: 30, exportBitrate: 8_000_000 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => load(),

  actions: {
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ exportFps: this.exportFps, exportBitrate: this.exportBitrate }),
      )
    },
  },
})
