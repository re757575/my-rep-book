import { describe, expect, it } from 'vitest'
import { isHiddenOrArchived } from './library'
import type { CustomExercise, LibraryExercise, PresetExercise } from './types'

const preset: PresetExercise = {
  source: 'preset',
  id: 'barbell-bench-press',
  nameZh: '槓鈴臥推',
  nameEn: 'Barbell Bench Press',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  equipment: 'barbell',
  trackingType: 'weight_reps',
}

const custom: CustomExercise = {
  source: 'custom',
  id: 'custom-1',
  nameZh: '史密斯臥推',
  nameEn: null,
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  equipment: 'machine',
  trackingType: 'weight_reps',
  archived: false,
  createdAt: '2026-10-24T04:00:00.000Z',
  updatedAt: '2026-10-24T04:00:00.000Z',
}

describe('isHiddenOrArchived：已隱藏的預設動作與已封存的自訂動作', () => {
  it.each<[string, LibraryExercise, boolean]>([
    ['未隱藏的預設動作', { ...preset, hidden: false }, false],
    ['已隱藏的預設動作', { ...preset, hidden: true }, true],
    ['未封存的自訂動作', custom, false],
    ['已封存的自訂動作', { ...custom, archived: true }, true],
  ])('%s → %s', (_, exercise, expected) => {
    expect(isHiddenOrArchived(exercise)).toBe(expected)
  })
})
