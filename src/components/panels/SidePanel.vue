<script setup lang="ts">
import { computed, ref } from 'vue'

import LockBadge from '@/components/common/LockBadge.vue'
import NumberField from '@/components/common/NumberField.vue'
import EffectsPanel from '@/components/panels/EffectsPanel.vue'
import PropertiesPanel from '@/components/panels/PropertiesPanel.vue'
import { useProjectStore } from '@/stores/project'
import { useToastStore } from '@/stores/toast'

type TabKey = 'properties' | 'effects'
const activeTab = ref<TabKey>('properties')
const projectStore = useProjectStore()
const toastStore = useToastStore()

const tabs: { key: TabKey; label: string }[] = [
  { key: 'properties', label: '变换' },
  { key: 'effects', label: '特效' },
]

const segment = computed(() => projectStore.selectedSegment)

const retime = (field: 'start' | 'end', value: number) => {
  const target = segment.value
  if (!target) return
  const start = field === 'start' ? value : target.start
  const end = field === 'end' ? value : target.end
  try {
    projectStore.retimeSegment(target.id, start, end)
  } catch (error) {
    toastStore.show(error instanceof Error ? error.message : '段时间调整失败')
  }
}
</script>

<template>
  <aside class="side-panel">
    <div v-if="segment" class="side-panel__segment">
      <div class="side-panel__segment-info">
        <span class="side-panel__segment-name">段 {{ segment.id.slice(-4) }}</span>
        <div class="side-panel__segment-time">
          <label class="time-field">
            <span>起</span>
            <NumberField
              :model-value="segment.start"
              :min="0"
              :max="segment.end - 0.1"
              :step="0.1"
              :disabled="segment.locked"
              @update:model-value="retime('start', $event)"
            />
          </label>
          <label class="time-field">
            <span>止</span>
            <NumberField
              :model-value="segment.end"
              :min="segment.start + 0.1"
              :max="projectStore.duration"
              :step="0.1"
              :disabled="segment.locked"
              @update:model-value="retime('end', $event)"
            />
          </label>
        </div>
      </div>
      <LockBadge :locked="segment.locked" @toggle="projectStore.toggleLock(segment.id)" />
    </div>

    <div class="side-panel__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="side-panel__tab"
        :class="{ 'side-panel__tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="side-panel__content">
      <PropertiesPanel v-show="activeTab === 'properties'" />
      <EffectsPanel v-show="activeTab === 'effects'" />
    </div>
  </aside>
</template>

<style scoped>
.side-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-slate-900);
  border-left: 1px solid var(--color-slate-800);
  overflow: hidden;
}
.side-panel__segment {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--color-slate-800);
}
.side-panel__segment-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
}
.side-panel__segment-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
}
.side-panel__segment-time {
  display: flex;
  gap: var(--spacing-3);
}
.time-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-slate-500);
}
.side-panel__tabs {
  display: flex;
  padding: var(--spacing-2);
  gap: var(--spacing-1);
  border-bottom: 1px solid var(--color-slate-800);
}
.side-panel__tab {
  flex: 1;
  padding: var(--spacing-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-slate-400);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--animate-fast);
}
.side-panel__tab:hover {
  color: var(--color-slate-100);
  background: var(--color-slate-800);
}
.side-panel__tab--active {
  color: var(--color-slate-50);
  background: var(--color-slate-800);
  font-weight: var(--font-weight-medium);
}
.side-panel__content {
  flex: 1;
  overflow-y: auto;
}
</style>
