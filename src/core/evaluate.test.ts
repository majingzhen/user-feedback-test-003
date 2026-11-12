import { describe, expect, it } from 'vitest'

import { effectsAt, evaluateAt, findSegmentAt } from '@/core/evaluate'
import type { Project, Segment } from '@/types/project'
import { NEUTRAL_EFFECTS } from '@/types/project'

const segment = (overrides: Partial<Segment>): Segment => ({
  id: 'seg_1',
  start: 1,
  end: 4,
  locked: false,
  keyframes: { x: [], y: [], scale: [], opacity: [] },
  effects: { ...NEUTRAL_EFFECTS, brightness: 1.5 },
  ...overrides,
})

const projectOf = (segments: Segment[]): Pick<Project, 'segments'> => ({ segments })

describe('evaluate', () => {
  it('段外返回中性帧且 segmentId 为 null', () => {
    const project = projectOf([segment({})])
    const frame = evaluateAt(project, 0.5)
    expect(frame.segmentId).toBeNull()
    expect(frame.scale).toBe(1)
    expect(frame.opacity).toBe(1)
    expect(frame.effects.brightness).toBe(1)
  })

  it('段内命中并取段特效', () => {
    const project = projectOf([segment({})])
    const frame = evaluateAt(project, 2)
    expect(frame.segmentId).toBe('seg_1')
    expect(frame.effects.brightness).toBe(1.5)
  })

  it('段边界 [start, end) 归属正确，end 用 eps 包容', () => {
    const project = projectOf([segment({})])
    expect(findSegmentAt(project.segments, 1)?.id).toBe('seg_1')
    expect(findSegmentAt(project.segments, 4)?.id).toBe('seg_1')
    expect(findSegmentAt(project.segments, 4.1)).toBeNull()
  })

  it('相邻段阶跃按各自轨道独立求值', () => {
    const a = segment({
      id: 'seg_a',
      start: 0,
      end: 2,
      keyframes: { x: [{ id: 'a', time: 0, value: 10, easing: 'linear' }], y: [], scale: [], opacity: [] },
    })
    const b = segment({
      id: 'seg_b',
      start: 2,
      end: 5,
      keyframes: { x: [{ id: 'b', time: 2, value: 90, easing: 'linear' }], y: [], scale: [], opacity: [] },
    })
    const project = projectOf([a, b])
    expect(evaluateAt(project, 1.9).x).toBe(10)
    expect(evaluateAt(project, 2).x).toBe(90)
  })

  it('effectsAt 段内段外分别返回段配置与中性值', () => {
    const project = projectOf([segment({})])
    expect(effectsAt(project, 2).brightness).toBe(1.5)
    expect(effectsAt(project, 9).brightness).toBe(NEUTRAL_EFFECTS.brightness)
  })
})
