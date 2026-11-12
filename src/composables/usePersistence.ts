import { listProjects, loadAsset, loadProject } from '@/persistence/idb'
import { useProjectStore } from '@/stores/project'
import { migrate } from '@/core/schema'
import type { Project } from '@/types/project'

export interface RestoredProject {
  project: Project
  hasVideo: boolean
}

// 启动恢复：列出工程；有 Blob 自动恢复，大文件降级则只回工程等待重选
export const usePersistence = () => {
  const projectStore = useProjectStore()

  const listRestorable = async (): Promise<RestoredProject[]> => {
    const projects = await listProjects()
    return projects.map((project) => ({
      project,
      hasVideo: project.videoMeta?.blobStored === true,
    }))
  }

  const restore = async (id: string): Promise<Project> => {
    const migrated = migrate(await loadProject(id))
    let file: File | null = null
    let url: string | null = null

    if (migrated.videoMeta?.blobStored) {
      const asset = await loadAsset(id)
      if (asset) {
        file = new File([asset.blob], migrated.videoMeta.fileName, {
          type: migrated.videoMeta.mimeType,
          lastModified: migrated.videoMeta.lastModified,
        })
        url = URL.createObjectURL(file)
      }
    }
    projectStore.hydrate(migrated, file, url)
    return migrated
  }

  return { listRestorable, restore }
}
