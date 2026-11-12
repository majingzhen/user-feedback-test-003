<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw, Sparkles } from 'lucide-vue-next'

import IconButton from '@/components/common/IconButton.vue'
import SliderRow from '@/components/common/SliderRow.vue'
import { usePlayerStore } from '@/stores/player'
import { useProjectStore } from '@/stores/project'
import { EFFECT_KEYS, EFFECT_LABELS, EFFECT_SPEC } from '@/types/project'
import type { EffectKey } from '@/types/project'

const projectStore = useProjectStore()
const playerStore = usePlayerStore()
const segment = computed(() => projectStore.selectedSegment)

const updateEffect = (key: EffectKey, value: number) => {
  if (!segment.value || playerStore.exporting) return
  projectStore.setEffect(segment.value.id, key, value)
}

const reset = () => {
  if (segment.value && !playerStore.exporting) projectStore.resetEffects(segment.value.id)
}
</script>

<template>
  <div class="panel">
    <template v-if="segment">
      <div class="panel__head">
        <span class="panel__title">画面特效</span>
        <IconButton
          :icon="RotateCcw"
          label="重置"
          variant="ghost"
          :disabled="playerStore.exporting"
          @click="reset"
        />
      </div>

      <p class="panel__hint">
        <Sparkles :size="13" :stroke-width="1.75" />
        特效与关键帧独立存储，段锁定后仍可调整，不会改动已确认的关键帧
      </p>

      <div
        v-for="key in EFFECT_KEYS"
        :key="key"
        class="effect-row"
      >
        <SliderRow
          :label="EFFECT_LABELS[key]"
          :model-value="segment.effects[key]"
          :min="EFFECT_SPEC[key].min"
          :max="EFFECT_SPEC[key].max"
          :step="EFFECT_SPEC[key].step"
          :unit="EFFECT_SPEC[key].unit"
          :disabled="playerStore.exporting"
          @update:model-value="updateEffect(key, $event)"
        />
      </div>
    </template>

    <div v-else class="panel__empty">
      <Sparkles :size="28" :stroke-width="1.5" />
      <p>选择一个段后，为它配置亮度、对比度、模糊和色调</p>
    </div>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel__title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
}
.panel__hint {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  margin: 0;
  padding: var(--spacing-3);
  background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary-500) 35%, transparent);
  border-radius: var(--radius-sm);
  color: var(--color-primary-400);
  font-size: var(--text-xs);
  line-height: 1.5;
}
.effect-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: var(--color-slate-850);
  border: 1px solid var(--color-slate-800);
  border-radius: var(--radius);
}
.panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6) var(--spacing-4);
  color: var(--color-slate-500);
  text-align: center;
  font-size: var(--text-xs);
}
</style>
