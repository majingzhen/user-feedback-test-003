<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: number
    min: number
    max: number
    step?: number
    unit?: string
    disabled?: boolean
  }>(),
  { step: 0.01, unit: '', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const displayValue = computed(() => {
  const decimals = props.step >= 1 ? 0 : props.step >= 0.1 ? 1 : 2
  return props.modelValue.toFixed(decimals)
})

const onInput = (event: Event) => {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="slider-row" :class="{ 'is-disabled': disabled }">
    <div class="slider-row__head">
      <span class="slider-row__label">{{ label }}</span>
      <span class="slider-row__value">{{ displayValue }}{{ unit }}</span>
    </div>
    <input
      class="slider-row__range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.slider-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.slider-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.slider-row__label {
  font-size: var(--text-xs);
  color: var(--color-slate-300);
}
.slider-row__value {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--color-slate-100);
}
.slider-row__range {
  width: 100%;
  height: 4px;
  cursor: pointer;
}
.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
