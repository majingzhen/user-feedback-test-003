<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min: number
    max: number
    step?: number
    disabled?: boolean
  }>(),
  { step: 0.01, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const text = computed({
  get: () => String(props.modelValue),
  set: (value: string) => {
    const num = Number(value)
    if (!Number.isNaN(num)) emit('update:modelValue', num)
  },
})
</script>

<template>
  <input
    v-model="text"
    class="number-field"
    type="number"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
  />
</template>

<style scoped>
.number-field {
  width: 72px;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-slate-800);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-sm);
  color: var(--color-slate-100);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color var(--animate-fast);
}
.number-field:focus {
  border-color: var(--color-primary-500);
}
.number-field:disabled {
  opacity: 0.45;
}
</style>
