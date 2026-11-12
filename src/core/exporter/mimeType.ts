// MediaRecorder 能力探测与降级链：vp9,opus → vp8,opus → 裸 webm → 不支持
const CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export const probeWebmMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  // 延迟回收，确保下载已发起
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
