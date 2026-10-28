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

describe('分類映射：包含次要部位', () => {
  const base = PRESET_EXERCISES[0]
  const chestPrimary = {
    ...base,
    id: 'chest-p',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
  } as const
  const chestSecondary = {
    ...base,
    id: 'chest-s',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest'],
  } as const
  const unrelated = {
    ...base,
    id: 'other',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
  } as const

  it('預設與 includeSecondary: false 都只看主要部位', () => {
    const exercises = [chestSecondary, chestPrimary, unrelated]
    expect(exercisesInCategory(exercises, 'chest')).toEqual([chestPrimary])
    expect(exercisesInCategory(exercises, 'chest', { includeSecondary: false })).toEqual([
      chestPrimary,
    ])
  })

  it('開啟後納入次要部位，主要部位屬於該分類的排前面，兩段各自維持原順序', () => {
    const anotherSecondary = { ...chestSecondary, id: 'chest-s2' }
    const anotherPrimary = { ...chestPrimary, id: 'chest-p2' }
    const exercises = [chestSecondary, unrelated, chestPrimary, anotherSecondary, anotherPrimary]

    expect(
      exercisesInCategory(exercises, 'chest', { includeSecondary: true }).map((e) => e.id),
    ).toEqual(['chest-p', 'chest-p2', 'chest-s', 'chest-s2'])
  })

  it('次要部位透過映射表歸類：斜方肌的次要部位算在「肩」、前臂算在「手臂：二頭」', () => {
    const trapsSecondary = {
      ...base,
      id: 'traps-s',
      primaryMuscles: ['back'],
      secondaryMuscles: ['traps'],
    } as const
    const forearmsSecondary = {
      ...base,
      id: 'forearms-s',
      primaryMuscles: ['back'],
      secondaryMuscles: ['forearms'],
    } as const

    expect(exercisesInCategory([trapsSecondary], 'shoulders', { includeSecondary: true })).toEqual([
      trapsSecondary,
    ])
    expect(exercisesInCategory([forearmsSecondary], 'biceps', { includeSecondary: true })).toEqual([
      forearmsSecondary,
    ])
  })

  it('主要與次要都屬於該分類的動作只出現一次', () => {
    const both = {
      ...base,
      id: 'both',
      primaryMuscles: ['shoulders'],
      secondaryMuscles: ['traps'],
    } as const

    expect(exercisesInCategory([both], 'shoulders', { includeSecondary: true })).toEqual([both])
  })

  it('預設動作庫：選「三頭」開啟後多出臥推等把三頭當次要部位的動作', () => {
    const primaryIds = idsIn('triceps')
    const withSecondary = exercisesInCategory(PRESET_EXERCISES, 'triceps', {
      includeSecondary: true,
    }).map((exercise) => exercise.id)

    expect(withSecondary.slice(0, primaryIds.length)).toEqual(primaryIds)
    expect(withSecondary).toContain('barbell-bench-press')
    expect(withSecondary.length).toBeGreaterThan(primaryIds.length)
  })
})
