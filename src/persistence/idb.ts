import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { Project, VideoMeta } from '@/types/project'

interface AssetRecord {
  blob: Blob
  videoMeta: VideoMeta
  storedAt: number
}

interface ToolDB extends DBSchema {
  projects: {
    key: string
    value: Project
    indexes: { by_updatedAt: number }
  }
  assets: {
    key: string
    value: AssetRecord
  }
}

const DB_NAME = 'keyframe-video-tool'
const DB_VERSION = 1
const BLOB_HARD_CAP = 500 * 1024 * 1024

let dbPromise: Promise<IDBPDatabase<ToolDB>> | null = null

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ToolDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('by_updatedAt', 'updatedAt')
        db.createObjectStore('assets')
      },
    })
  }
  return dbPromise
}

// 容量判定：文件小于配额余量 80% 且不超过硬上限才存 Blob
export const canStoreBlob = async (fileSize: number): Promise<boolean> => {
  if (fileSize > BLOB_HARD_CAP) return false
  if (!navigator.storage?.estimate) return fileSize <= BLOB_HARD_CAP
  const { quota = 0, usage = 0 } = await navigator.storage.estimate()
  if (!quota) return fileSize <= BLOB_HARD_CAP
  return fileSize <= (quota - usage) * 0.8
}

export const requestPersistentStorage = async (): Promise<void> => {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // 授权失败不阻塞主流程
  }
}

export const saveProject = async (project: Project): Promise<void> => {
  const db = await getDB()
  await db.put('projects', project)
}

export const loadProject = async (id: string): Promise<Project | undefined> => {
  const db = await getDB()
  return db.get('projects', id)
}

export const listProjects = async (): Promise<Project[]> => {
  const db = await getDB()
  const projects = await db.getAllFromIndex('projects', 'by_updatedAt')
  return projects.reverse()
}

// 工程与视频 Blob 同事务写，避免跨 await 事务自动提交导致的不一致
export const saveProjectWithAsset = async (
  project: Project,
  blob: Blob,
  videoMeta: VideoMeta,
): Promise<void> => {
  const db = await getDB()
  const tx = db.transaction(['projects', 'assets'], 'readwrite')
  await Promise.all([
    tx.objectStore('projects').put(project),
    tx.objectStore('assets').put({ blob, videoMeta, storedAt: Date.now() }, project.id),
    tx.done,
  ])
}

export const loadAsset = async (projectId: string): Promise<AssetRecord | undefined> => {
  const db = await getDB()
  return db.get('assets', projectId)
}

export const deleteProject = async (projectId: string): Promise<void> => {
  const db = await getDB()
  const tx = db.transaction(['projects', 'assets'], 'readwrite')
  await Promise.all([
    tx.objectStore('projects').delete(projectId),
    tx.objectStore('assets').delete(projectId),
    tx.done,
  ])
}
