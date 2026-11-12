<script setup lang="ts">
import { Lock, Unlock } from 'lucide-vue-next'

defineProps<{ locked: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="lock-badge" :class="{ 'is-locked': locked }" @click="$emit('toggle')">
    <component :is="locked ? Lock : Unlock" :size="14" :stroke-width="1.75" />
    <span>{{ locked ? '已锁定' : '未锁定' }}</span>
  </button>
</template>

<style scoped>
.lock-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-slate-800);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-sm);
  color: var(--color-slate-300);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--animate-fast);
}
.lock-badge:hover {
  border-color: var(--color-slate-500);
  color: var(--color-slate-100);
}
.lock-badge.is-locked {
  background: color-mix(in srgb, var(--color-primary-500) 14%, transparent);
  border-color: var(--color-primary-500);
  color: var(--color-primary-400);
}
</style>
