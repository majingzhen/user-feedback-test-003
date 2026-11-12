import type { SegmentEffects } from '@/types/project'
import { EFFECT_SPEC } from '@/types/project'

// 固定滤镜链顺序：blur → brightness → contrast → hue-rotate
// 预览与导出共用此函数，顺序即契约，调换会导致画面结果不一致
export const buildFilterString = (effects: SegmentEffects): string => {
  const parts: string[] = []
  if (effects.blur !== EFFECT_SPEC.blur.neutral) parts.push(`blur(${effects.blur}px)`)
  if (effects.brightness !== EFFECT_SPEC.brightness.neutral)
    parts.push(`brightness(${effects.brightness})`)
  if (effects.contrast !== EFFECT_SPEC.contrast.neutral)
    parts.push(`contrast(${effects.contrast})`)
  if (effects.hueRotate !== EFFECT_SPEC.hueRotate.neutral)
    parts.push(`hue-rotate(${effects.hueRotate}deg)`)
  return parts.length > 0 ? parts.join(' ') : 'none'
}
