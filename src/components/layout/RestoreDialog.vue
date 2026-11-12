<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FileVideo, X } from 'lucide-vue-next'

import { usePersistence, type RestoredProject } from '@/composables/usePersistence'

const emit = defineEmits<{ restored: []; dismissed: [] }>()

const { listRestorable, restore } = usePersistence()
const projects = ref<RestoredProject[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    projects.value = await listRestorable()
  } finally {
    loading.value = false
  }
})

const open = async (id: string) => {
  await restore(id)
  emit('restored')
}

const formatSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="modal-mask">
    <div class="modal">
      <button class="modal__close" @click="emit('dismissed')">
        <X :size="18" :stroke-width="1.75" />
      </button>
      <h2 class="modal__title">恢复之前的工程</h2>
      <p class="modal__sub">关键帧和特效配置已保存在本机浏览器中</p>

      <div v-if="loading" class="modal__status">正在读取本地工程…</div>

      <div v-else-if="projects.length === 0" class="modal__empty">
        <FileVideo :size="36" :stroke-width="1.5" />
        <p>没有可恢复的工程，先导入一个视频吧</p>
      </div>

      <div v-else class="modal__list">
        <button
          v-for="item in projects"
          :key="item.project.id"
          class="project-card"
          @click="open(item.project.id)"
        >
          <div class="project-card__main">
            <span class="project-card__name">{{ item.project.name }}</span>
            <span class="project-card__meta">
              {{ item.project.videoMeta?.fileName }} · {{ formatSize(item.project.videoMeta?.fileSize ?? 0) }}
            </span>
          </div>
          <span class="project-card__state" :class="item.hasVideo ? 'is-ready' : 'is-missing'">
            {{ item.hasVideo ? '可直接恢复' : '需重选源视频' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(8 13 24 / 0.72);
  backdrop-filter: blur(4px);
}
.modal {
  position: relative;
  width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-5);
  background: var(--color-slate-900);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}
.modal__close {
  position: absolute;
  top: var(--spacing-3);
  right: var(--spacing-3);
  display: inline-flex;
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-slate-400);
  cursor: pointer;
}
.modal__close:hover {
  color: var(--color-slate-100);
  background: var(--color-slate-800);
}
.modal__title {
  margin: 0 0 var(--spacing-1);
  font-size: var(--text-xl);
  font-weight: var(--font-weight-semibold);
}
.modal__sub {
  margin: 0 0 var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-slate-500);
}
.modal__status,
.modal__empty {
  padding: var(--spacing-6) 0;
  text-align: center;
  color: var(--color-slate-500);
  font-size: var(--text-sm);
}
.modal__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}
.modal__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  overflow-y: auto;
}
.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-slate-850);
  border: 1px solid var(--color-slate-800);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--animate-fast);
}
.project-card:hover {
  border-color: var(--color-primary-500);
}
.project-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.project-card__name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
}
.project-card__meta {
  font-size: var(--text-xs);
  color: var(--color-slate-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-card__state {
  flex-shrink: 0;
  font-size: var(--text-xs);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
}
.project-card__state.is-ready {
  color: var(--color-success-500);
  background: color-mix(in srgb, var(--color-success-500) 12%, transparent);
}
.project-card__state.is-missing {
  color: var(--color-warning-500);
  background: color-mix(in srgb, var(--color-warning-500) 12%, transparent);
}
</style>
