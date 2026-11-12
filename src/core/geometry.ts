// 向下取偶数：MediaRecorder 对奇数尺寸支持差，可能报错或产生绿边
export const evenFloor = (v: number): number => Math.max(2, Math.floor(v) - (Math.floor(v) % 2))

export interface FitRect {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

// contain 适配：视频完整落在画布内并居中，返回 CSS 像素坐标系下的矩形
export const containRect = (
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
): FitRect => {
  const fit = Math.min(canvasWidth / videoWidth, canvasHeight / videoHeight)
  const width = videoWidth * fit
  const height = videoHeight * fit
  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height,
    scale: fit,
  }
}

// 设备像素比上限 2，避免高分屏后备存储过大拖慢渲染
export const boundedDpr = (devicePixelRatio: number): number =>
  Math.min(2, Math.max(1, devicePixelRatio || 1))

// 由容器 CSS 尺寸推算 canvas 后备存储尺寸（偶数化）
export const backingSize = (
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): { width: number; height: number } => ({
  width: evenFloor(cssWidth * dpr),
  height: evenFloor(cssHeight * dpr),
})
