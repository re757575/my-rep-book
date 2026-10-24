import { describe, expect, it } from 'vitest'
import { getRecentExercises } from './recent'
import type { LibraryExercise, LocalDate, Workout } from './types'

function preset(id: string, hidden = false): LibraryExercise {
  return {
    source: 'preset',
    id,
    nameZh: id,
    nameEn: null,
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    trackingType: 'weight_reps',
    hidden,
  }
}

function custom(id: string, archived = false): LibraryExercise {
  return {
    source: 'custom',
    id,
    nameZh: id,
    nameEn: null,
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'machine',
    trackingType: 'weight_reps',
    archived,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }
}

/** 一筆訓練：依序做了這些動作（組的內容與最近使用無關，一律留空） */
function workout(date: LocalDate, exerciseIds: string[]): Workout {
  return {
    date,
    exercises: exerciseIds.map((exerciseId, index) => ({
      id: `${date}-${index}`,
      exerciseId,
      note: '',
      sets: [],
    })),
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  }
}

const LIBRARY = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => preset(id))

function recentIds(workouts: Workout[], library = LIBRARY, limit?: number) {
  return getRecentExercises(workouts, library, limit).map((exercise) => exercise.id)
}

describe('getRecentExercises：最近使用的動作', () => {
  it('沒有任何訓練時為空', () => {
    expect(recentIds([])).toEqual([])
  })

  it('依最近一次使用的日期由新到舊排序，不受訓練傳入的順序影響', () => {
    const workouts = [
      workout('2026-10-20', ['a']),
      workout('2026-10-24', ['c']),
      workout('2026-10-22', ['b']),
    ]

    expect(recentIds(workouts)).toEqual(['c', 'b', 'a'])
  })

  it('同一天的動作，越後面做的越前面', () => {
    expect(recentIds([workout('2026-10-24', ['a', 'b', 'c'])])).toEqual(['c', 'b', 'a'])
  })

  it('去除重複：同一個動作只出現一次，位置依最近一次使用', () => {
    const workouts = [
      workout('2026-10-20', ['a', 'b']),
      workout('2026-10-22', ['c', 'a']),
      workout('2026-10-24', ['b', 'b']),
    ]

    expect(recentIds(workouts)).toEqual(['b', 'a', 'c'])
  })

  it('最多 8 個，取最近使用的 8 個', () => {
    const workouts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id, index) =>
      workout(`2026-10-${String(10 + index).padStart(2, '0')}`, [id]),
    )

    expect(recentIds(workouts)).toEqual(['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c'])
  })

  it('可以指定上限', () => {
    expect(recentIds([workout('2026-10-24', ['a', 'b', 'c'])], LIBRARY, 2)).toEqual(['c', 'b'])
  })

  it('排除已隱藏的預設動作與已封存的自訂動作，並由更早使用的動作遞補到上限', () => {
    const library = [
      preset('hidden', true),
      custom('archived', true),
      custom('custom'),
      ...LIBRARY.slice(0, 8),
    ]
    const workouts = [
      workout('2026-10-20', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']),
      workout('2026-10-24', ['custom', 'archived', 'hidden']),
    ]

    expect(recentIds(workouts, library)).toEqual(['custom', 'h', 'g', 'f', 'e', 'd', 'c', 'b'])
  })

  it('排除動作庫中找不到的動作 ID', () => {
    expect(recentIds([workout('2026-10-24', ['a', 'deleted'])])).toEqual(['a'])
  })

  it('回傳動作庫中的動作本身', () => {
    expect(getRecentExercises([workout('2026-10-24', ['a'])], LIBRARY)).toEqual([LIBRARY[0]])
  })
})
