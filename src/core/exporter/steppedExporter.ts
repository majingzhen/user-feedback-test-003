import type { Exporter } from '@/core/exporter/types'

// v2 占位：确定性步进导出（captureStream(0) + seek 串行队列 + requestFrame），
// 音频需 webm-muxer 合流。接口与 realtimeExporter 一致，渲染层无需改动。
export const steppedExporter: Exporter = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exportVideo(_input): Promise<never> {
    throw new Error('确定性步进导出将在 v2 提供，请先用实时录制')
  },
}
