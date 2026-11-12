import { describe, expect, it } from 'vitest'

import { buildFilterString } from '@/core/filter'
import { backingSize, boundedDpr, containRect, evenFloor } from '@/core/geometry'
import { assertSegmentUnlocked, createProject, createSegment, migrate, SegmentLockedError } from '@/core/schema'
import type { Segment } from '@/types/project'
import { NEUTRAL_EFFECTS } from '@/types/project'

describe('filter', () => {
  it('全中性输出 none', () => {
    expect(buildFilterString({ ...NEUTRAL_EFFECTS })).toBe('none')
  })

  it('滤镜链顺序固定且单位正确', () => {
    const filter = buildFilterString({ brightness: 1.2, contrast: 1.4, blur: 5, hueRotate: 90 })
    expect(filter).toBe('blur(5px) brightness(1.2) contrast(1.4) hue-rotate(90deg)')
  })
})

describe('geometry', () => {
  it('evenFloor 向下取偶数且最小为 2', () => {
    expect(evenFloor(101)).toBe(100)
    expect(evenFloor(100)).toBe(100)
    expect(evenFloor(1)).toBe(2)
  })

  it('containRect 居中且比例不变', () => {
    const rect = containRect(800, 600, 16, 9)
    expect(rect.width / rect.height).toBeCloseTo(16 / 9)
    expect(rect.x).toBeGreaterThan(0)
    expect(rect.y).toBe(0)
  })

  it('dpr 上限为 2 且兜底 1', () => {
    expect(boundedDpr(3)).toBe(2)
    expect(boundedDpr(0)).toBe(1)
  })

  it('backingSize 偶数化', () => {
    const size = backingSize(501, 303, 1)
    expect(size.width % 2).toBe(0)
    expect(size.height % 2).toBe(0)
  })
})

describe('schema', () => {
  it('createProject 产出合法空工程', () => {
    const project = createProject('测试')
    expect(project.segments).toEqual([])
    expect(project.schemaVersion).toBeGreaterThanOrEqual(1)
  })

  it('createSegment 相邻时播种边界 hold 值', () => {
    const project = createProject('测试')
    const first = createSegment(0, 2, project)
    first.keyframes.x = [{ id: 'x1', time: 0, value: 30, easing: 'linear' }]
    project.segments.push(first)
    const next = createSegment(2, 5, project)
    expect(next.keyframes.x[0].value).toBe(30)
  })

  it('锁定守卫对锁定段抛 SegmentLockedError', () => {
    const locked: Segment = { ...createSegment(0, 1, createProject('t')), locked: true }
    expect(() => assertSegmentUnlocked(locked)).toThrow(SegmentLockedError)
    expect(() => assertSegmentUnlocked({ ...locked, locked: false })).not.toThrow()
  })

  it('migrate 拒绝非法结构和高版本', () => {
    expect(() => migrate({ foo: 1 })).toThrow()
    expect(() => migrate({ schemaVersion: 999, segments: [] })).toThrow()
    expect(migrate({ schemaVersion: 1, segments: [] })).toBeTruthy()
  })
})
