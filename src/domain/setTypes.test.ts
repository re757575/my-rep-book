import { describe, expect, it } from 'vitest'
import {
  isWarmupSet,
  isWorkingSet,
  migrateWorkoutSetTypes,
  nextSetType,
  SET_TYPE_LABELS,
  SET_TYPE_SHORT_LABELS,
} from './setTypes'
import { SET_TYPES } from './types'

describe('nextSetType：類型按鈕按一下的下一個', () => {
  it('正式 → 熱身 → 遞減 → 力竭 → 正式，標熱身只要按一下', () => {
    expect(nextSetType('regular')).toBe('warmup')
    expect(nextSetType('warmup')).toBe('drop')
    expect(nextSetType('drop')).toBe('failure')
    expect(nextSetType('failure')).toBe('regular')
  })

  it('按 4 次回到原本的類型', () => {
    for (const type of SET_TYPES) {
      expect(nextSetType(nextSetType(nextSetType(nextSetType(type))))).toBe(type)
    }
  })
})

describe('isWarmupSet／isWorkingSet', () => {
  it('只有熱身不是正式組，遞減與力竭都算正式組', () => {
    expect(SET_TYPES.map((setType) => [setType, isWorkingSet({ setType })])).toEqual([
      ['regular', true],
      ['warmup', false],
      ['drop', true],
      ['failure', true],
    ])
    expect(SET_TYPES.filter((setType) => isWarmupSet({ setType }))).toEqual(['warmup'])
  })
})

describe('標籤', () => {
  it('每個類型都有名稱與單字的簡稱', () => {
    expect(SET_TYPES.map((type) => SET_TYPE_LABELS[type])).toEqual(['正式', '熱身', '遞減', '力竭'])
    expect(SET_TYPES.map((type) => SET_TYPE_SHORT_LABELS[type])).toEqual(['正', '熱', '遞', '竭'])
  })
})

describe('migrateWorkoutSetTypes：isWarmup 換成 setType', () => {
  const values = { type: 'weight_reps', weightKg: 60, reps: 8 }

  it('true 變熱身，false 變正式，其他欄位不動', () => {
    const migrated = migrateWorkoutSetTypes({
      date: '2026-10-20',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'barbell-bench-press',
          note: '',
          sets: [
            { id: 'a', isWarmup: true, values },
            { id: 'b', isWarmup: false, values },
          ],
        },
      ],
    })
    expect(migrated).toEqual({
      date: '2026-10-20',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'barbell-bench-press',
          note: '',
          sets: [
            { id: 'a', setType: 'warmup', values },
            { id: 'b', setType: 'regular', values },
          ],
        },
      ],
    })
  })

  it('已經是新格式的組不動；格式不對的資料原樣保留，留給驗證指出錯誤', () => {
    const current = { exercises: [{ sets: [{ id: 'a', setType: 'drop', values }] }] }
    expect(migrateWorkoutSetTypes(current)).toEqual(current)
    expect(migrateWorkoutSetTypes('不是物件')).toBe('不是物件')
    expect(migrateWorkoutSetTypes({ exercises: 'x' })).toEqual({ exercises: 'x' })
    expect(migrateWorkoutSetTypes({ exercises: [null, { sets: 5 }] })).toEqual({
      exercises: [null, { sets: 5 }],
    })
  })

  it('isWarmup 不是布林時當作正式', () => {
    const migrated = migrateWorkoutSetTypes({ exercises: [{ sets: [{ isWarmup: 'yes' }] }] })
    expect(migrated).toEqual({ exercises: [{ sets: [{ setType: 'regular' }] }] })
  })
})
