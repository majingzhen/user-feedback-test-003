import { describe, expect, it } from 'vitest'

import { easeInOut, lerp, removeKeyframe, sampleTrack, TIME_EPS, upsertKeyframe } from '@/core/interpolation'
import type { Keyframe } from '@/types/project'

const frame = (time: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe => ({
  id: `kf_${time}_${value}`,
  time,
  value,
  easing,
})

describe('interpolation', () => {
  it('空轨道回中性默认值', () => {
    expect(sampleTrack([], 1, 'x')).toBe(0)
    expect(sampleTrack([], 1, 'scale')).toBe(1)
    expect(sampleTrack([], 1, 'opacity')).toBe(1)
  })

  it('首帧前钳制 hold 首值', () => {
    const track = [frame(2, 10), frame(5, 20)]
    expect(sampleTrack(track, 0, 'x')).toBe(10)
    expect(sampleTrack(track, 1.999, 'x')).toBe(10)
  })

  it('末帧后钳制 hold 末值', () => {
    const track = [frame(2, 10), frame(5, 20)]
    expect(sampleTrack(track, 8, 'x')).toBe(20)
  })

  it('精确命中关键帧返回该帧值', () => {
    const track = [frame(2, 10), frame(5, 20)]
    expect(sampleTrack(track, 2, 'x')).toBe(10)
    expect(sampleTrack(track, 5, 'x')).toBe(20)
  })

  it('linear 中点线性插值', () => {
    const track = [frame(0, 0), frame(10, 100)]
    expect(sampleTrack(track, 5, 'x')).toBe(50)
    expect(sampleTrack(track, 2.5, 'x')).toBe(25)
  })

  it('easeInOut 端点与中点符合 smoothstep', () => {
    const track = [frame(0, 0, 'easeInOut'), frame(10, 100, 'linear')]
    expect(sampleTrack(track, 0, 'x')).toBe(0)
    expect(sampleTrack(track, 10, 'x')).toBe(100)
    expect(sampleTrack(track, 5, 'x')).toBeCloseTo(50)
    expect(easeInOut(0.5)).toBe(0.5)
  })

  it('eps 内浮点抖动不产生命中闪烁', () => {
    const track = [frame(1, 0), frame(2, 100)]
    expect(sampleTrack(track, 1 + TIME_EPS / 2, 'x')).toBe(0)
  })

  it('lerp 边界正确', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
  })

  it('upsertKeyframe 同时间点覆盖并保持升序', () => {
    const track = [frame(0, 0), frame(2, 20)]
    const updated = upsertKeyframe(track, { ...frame(2, 99), id: track[1].id })
    expect(updated).toHaveLength(2)
    expect(updated[1].value).toBe(99)

    const inserted = upsertKeyframe(track, frame(1, 10))
    expect(inserted.map((k) => k.time)).toEqual([0, 1, 2])
  })

  it('removeKeyframe 按 id 删除', () => {
    const track = [frame(0, 0), frame(2, 20)]
    expect(removeKeyframe(track, track[0].id)).toHaveLength(1)
  })
})
