import { describe, expect, it } from 'vitest'
import { PRESET_EXERCISES, exercisesInCategory, type PresetExercise } from './index'

describe('預設動作庫完整性', () => {
  it('共有 66 個預設動作', () => {
    expect(PRESET_EXERCISES).toHaveLength(66)
  })

  it('ID 唯一，而且符合 slug 格式', () => {
    const ids = PRESET_EXERCISES.map((exercise) => exercise.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('中文名稱唯一', () => {
    const names = PRESET_EXERCISES.map((exercise) => exercise.nameZh)

    expect(new Set(names).size).toBe(names.length)
  })

  it.each(PRESET_EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
    '%s 主要部位至少 1 個，且主要和次要部位不重複',
    (_id, exercise) => {
      expect(exercise.primaryMuscles.length).toBeGreaterThanOrEqual(1)
      for (const muscle of exercise.secondaryMuscles) {
        expect(exercise.primaryMuscles).not.toContain(muscle)
      }
      expect(new Set(exercise.primaryMuscles).size).toBe(exercise.primaryMuscles.length)
      expect(new Set(exercise.secondaryMuscles).size).toBe(exercise.secondaryMuscles.length)
    },
  )

  it.each([
    ['chest'],
    ['back'],
    ['shoulders'],
    ['biceps'],
    ['triceps'],
    ['quads_glutes'],
    ['hamstrings'],
    ['calves'],
    ['core'],
    ['cardio_full_body'],
  ] as const)('分類 %s 至少有 1 個動作', (category) => {
    expect(exercisesInCategory(PRESET_EXERCISES, category).length).toBeGreaterThanOrEqual(1)
  })

  it.each([
    {
      source: 'preset',
      id: 'barbell-squat',
      nameZh: '槓鈴深蹲',
      nameEn: 'Barbell Squat',
      primaryMuscles: ['quads', 'glutes'],
      secondaryMuscles: ['hamstrings', 'core'],
      equipment: 'barbell',
      trackingType: 'weight_reps',
    },
    {
      source: 'preset',
      id: 'shrug',
      nameZh: '聳肩',
      nameEn: 'Shrug',
      primaryMuscles: ['traps'],
      secondaryMuscles: ['forearms'],
      equipment: 'dumbbell',
      trackingType: 'weight_reps',
    },
    {
      source: 'preset',
      id: 'plank',
      nameZh: '平板支撐',
      nameEn: 'Plank',
      primaryMuscles: ['core'],
      secondaryMuscles: ['shoulders'],
      equipment: 'bodyweight',
      trackingType: 'duration',
    },
    {
      source: 'preset',
      id: 'stationary-bike',
      nameZh: '飛輪／腳踏車',
      nameEn: 'Stationary Bike',
      primaryMuscles: ['full_body'],
      secondaryMuscles: ['quads'],
      equipment: 'cardio_machine',
      trackingType: 'distance_duration',
    },
    {
      source: 'preset',
      id: 'ab-wheel-rollout',
      nameZh: '腹輪',
      nameEn: 'Ab Wheel Rollout',
      primaryMuscles: ['core'],
      secondaryMuscles: ['shoulders'],
      equipment: 'other',
      trackingType: 'reps',
    },
  ] satisfies PresetExercise[])('$id 與 PRD 附錄 A 一致', (expected) => {
    expect(PRESET_EXERCISES.find((exercise) => exercise.id === expected.id)).toEqual(expected)
  })
})
