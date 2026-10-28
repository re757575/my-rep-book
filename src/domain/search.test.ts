import { describe, expect, it } from 'vitest'
import { PRESET_EXERCISES, filterExercises, matchesSearch, type ExerciseBase } from './index'

const benchPress: ExerciseBase = {
  id: 'barbell-bench-press',
  nameZh: '槓鈴臥推',
  nameEn: 'Barbell Bench Press',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders'],
  equipment: 'barbell',
  trackingType: 'weight_reps',
}

const noEnglishName: ExerciseBase = {
  ...benchPress,
  id: 'custom-1',
  nameZh: '史密斯臥推',
  nameEn: null,
}

describe('搜尋比對', () => {
  it.each([
    { query: 'bench', exercise: benchPress, expected: true },
    { query: 'BENCH', exercise: benchPress, expected: true },
    { query: '  Bench Press  ', exercise: benchPress, expected: true },
    { query: 'barbell bench press', exercise: benchPress, expected: true },
    { query: '臥推', exercise: benchPress, expected: true },
    { query: '  槓鈴 ', exercise: benchPress, expected: true },
    { query: 'squat', exercise: benchPress, expected: false },
    { query: '深蹲', exercise: benchPress, expected: false },
    // 前後空白之外的空白仍要比對
    { query: 'barbellbench', exercise: benchPress, expected: false },
    // 空字串與純空白視為沒有搜尋
    { query: '', exercise: benchPress, expected: true },
    { query: '   ', exercise: benchPress, expected: true },
    // 沒有英文名稱時只比對中文名稱
    { query: '史密斯', exercise: noEnglishName, expected: true },
    { query: 'smith', exercise: noEnglishName, expected: false },
    { query: 'null', exercise: noEnglishName, expected: false },
  ])('「$query」比對 $exercise.nameZh → $expected', ({ query, exercise, expected }) => {
    expect(matchesSearch(exercise, query)).toBe(expected)
  })
})

describe('搜尋加上分類篩選', () => {
  function ids(query: string, category: Parameters<typeof filterExercises>[1]['category']) {
    return filterExercises(PRESET_EXERCISES, { query, category }).map((exercise) => exercise.id)
  }

  it.each([
    {
      query: 'bench',
      category: 'all',
      expected: [
        'barbell-bench-press',
        'dumbbell-bench-press',
        'close-grip-bench-press',
        'bench-dip',
      ],
    },
    {
      query: 'bench',
      category: 'chest',
      expected: ['barbell-bench-press', 'dumbbell-bench-press'],
    },
    { query: 'bench', category: 'triceps', expected: ['close-grip-bench-press', 'bench-dip'] },
    {
      query: '提踵',
      category: 'all',
      expected: ['standing-calf-raise', 'seated-calf-raise', 'leg-press-calf-raise'],
    },
    {
      query: '',
      category: 'calves',
      expected: ['standing-calf-raise', 'seated-calf-raise', 'leg-press-calf-raise'],
    },
    { query: 'curl', category: 'hamstrings', expected: ['leg-curl'] },
    { query: 'squat', category: 'core', expected: [] },
  ] as const)('「$query」＋分類 $category', ({ query, category, expected }) => {
    expect(ids(query, category)).toEqual(expected)
  })

  it('沒有搜尋且選「全部」時列出全部動作', () => {
    expect(filterExercises(PRESET_EXERCISES, { query: '', category: 'all' })).toHaveLength(66)
  })
})

describe('搜尋加上分類篩選：包含次要部位', () => {
  function ids(query: string, category: Parameters<typeof filterExercises>[1]['category']) {
    return filterExercises(PRESET_EXERCISES, { query, category, includeSecondary: true }).map(
      (exercise) => exercise.id,
    )
  }

  it('搜尋「bench」＋三頭：主要部位為三頭的排前面，把三頭當次要部位的臥推排後面', () => {
    expect(ids('bench', 'triceps')).toEqual([
      'close-grip-bench-press',
      'bench-dip',
      'barbell-bench-press',
      'dumbbell-bench-press',
    ])
  })

  it('選「全部」時 includeSecondary 沒有影響', () => {
    expect(
      filterExercises(PRESET_EXERCISES, { query: '', category: 'all', includeSecondary: true }),
    ).toHaveLength(66)
  })

  it('沒有指定 includeSecondary 時只看主要部位', () => {
    expect(
      filterExercises(PRESET_EXERCISES, { query: 'bench', category: 'triceps' }).map((e) => e.id),
    ).toEqual(['close-grip-bench-press', 'bench-dip'])
  })
})
