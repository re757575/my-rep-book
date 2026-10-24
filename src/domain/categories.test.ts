import { describe, expect, it } from 'vitest'
import { PRESET_EXERCISES, exercisesInCategory, type BrowseCategory } from './index'

function idsIn(category: BrowseCategory) {
  return exercisesInCategory(PRESET_EXERCISES, category).map((exercise) => exercise.id)
}

describe('分類映射：只看主要部位', () => {
  it.each<{ category: BrowseCategory; includes: string[]; excludes: string[] }>([
    // 次要部位有胸的窄握臥推不屬於「胸」
    {
      category: 'chest',
      includes: ['barbell-bench-press', 'push-up'],
      excludes: ['close-grip-bench-press'],
    },
    // 硬舉主要部位是背；划船機的次要部位是背，不屬於「背」
    {
      category: 'back',
      includes: ['deadlift', 'pull-up'],
      excludes: ['rowing-machine', 'romanian-deadlift'],
    },
    // 斜方肌映射到「肩」
    { category: 'shoulders', includes: ['shrug', 'overhead-press'], excludes: ['plank'] },
    {
      category: 'biceps',
      includes: ['barbell-curl', 'hammer-curl'],
      excludes: ['pull-up', 'shrug'],
    },
    {
      category: 'triceps',
      includes: ['close-grip-bench-press', 'triceps-dip'],
      excludes: ['chest-dip'],
    },
    // 臀推只有主要部位臀，也映射到「腿：股四頭／臀」
    {
      category: 'quads_glutes',
      includes: ['barbell-squat', 'hip-thrust', 'leg-extension'],
      excludes: ['stationary-bike'],
    },
    { category: 'hamstrings', includes: ['romanian-deadlift', 'leg-curl'], excludes: ['deadlift'] },
    { category: 'calves', includes: ['standing-calf-raise'], excludes: ['jump-rope'] },
    { category: 'core', includes: ['plank', 'cable-crunch'], excludes: ['barbell-squat'] },
    {
      category: 'cardio_full_body',
      includes: ['treadmill', 'kettlebell-swing', 'burpee'],
      excludes: ['hip-thrust'],
    },
  ])('$category', ({ category, includes, excludes }) => {
    const ids = idsIn(category)

    expect(ids).toEqual(expect.arrayContaining(includes))
    for (const id of excludes) {
      expect(ids).not.toContain(id)
    }
  })

  it('一個動作可以同時屬於多個分類', () => {
    const multiPrimary = {
      ...PRESET_EXERCISES[0],
      id: 'test-multi',
      primaryMuscles: ['chest', 'triceps'],
      secondaryMuscles: [],
    } as const

    expect(exercisesInCategory([multiPrimary], 'chest')).toEqual([multiPrimary])
    expect(exercisesInCategory([multiPrimary], 'triceps')).toEqual([multiPrimary])
    expect(exercisesInCategory([multiPrimary], 'back')).toEqual([])
  })

  it('保留原本的動作順序', () => {
    expect(idsIn('calves')).toEqual([
      'standing-calf-raise',
      'seated-calf-raise',
      'leg-press-calf-raise',
    ])
  })
})
