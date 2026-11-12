<script setup lang="ts">
import { Info } from 'lucide-vue-next'

import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <transition name="toast-host">
    <div v-if="toastStore.message" class="toast-host" @click="toastStore.dismiss()">
      <Info :size="15" :stroke-width="1.75" />
      <span>{{ toastStore.message }}</span>
    </div>
  </transition>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 272px;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-slate-800);
  border: 1px solid var(--color-slate-600);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  color: var(--color-slate-100);
  font-size: var(--text-xs);
  cursor: pointer;
}
.toast-host-enter-active,
.toast-host-leave-active {
  transition:
    opacity var(--animate-fast),
    transform var(--animate-fast);
}
.toast-host-enter-from,
.toast-host-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
