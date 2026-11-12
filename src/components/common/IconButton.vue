<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    icon: Component
    label?: string
    variant?: 'default' | 'primary' | 'ghost'
    disabled?: boolean
    title?: string
  }>(),
  { label: '', variant: 'default', disabled: false, title: '' },
)

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    class="icon-button"
    :class="[`icon-button--${variant}`, { 'icon-button--icon-only': !label }]"
    :disabled="disabled"
    :title="title || label"
    @click="$emit('click', $event)"
  >
    <component :is="icon" :size="16" :stroke-width="1.75" />
    <span v-if="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--animate-fast);
  white-space: nowrap;
}
.icon-button--icon-only {
  padding: var(--spacing-2);
}
.icon-button--default {
  background: var(--color-slate-800);
  border-color: var(--color-slate-700);
  color: var(--color-slate-200);
}
.icon-button--default:hover:not(:disabled) {
  border-color: var(--color-slate-500);
  color: var(--color-slate-50);
}
.icon-button--primary {
  background: var(--color-primary-600);
  color: #fff;
}
.icon-button--primary:hover:not(:disabled) {
  background: var(--color-primary-500);
}
.icon-button--ghost {
  background: transparent;
  color: var(--color-slate-400);
}
.icon-button--ghost:hover:not(:disabled) {
  background: var(--color-slate-800);
  color: var(--color-slate-100);
}
.icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
