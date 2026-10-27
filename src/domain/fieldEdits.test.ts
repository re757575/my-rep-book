import { describe, expect, it } from 'vitest'
import { applyFieldEdits, queueFieldEdit, settleFieldEdits, type FieldEdit } from './fieldEdits'
import type { SetField } from './setValues'
import type { Workout } from './types'

const DATE = '2026-10-24'

type SetValueEdit = Extract<FieldEdit, { kind: 'setValue' }>

/** 2026-10-24 訓練動作 we1 某一組的欄位編輯 */
function edit(field: SetField, value: number | null, setId = 's1'): SetValueEdit {
  return { kind: 'setValue', date: DATE, workoutExerciseId: 'we1', setId, field, value }
}

const weight = (value: number | null, setId = 's1') => edit('weightKg', value, setId)

/** 某一天的體重編輯 */
const bodyWeight = (weightKg: number | null, date = DATE): FieldEdit => ({
  kind: 'bodyWeight',
  date,
  weightKg,
})

describe('queueFieldEdit：快速連續輸入時合併寫入，以最後的值為準', () => {
  it('同一個欄位再次編輯時，只保留最後的值', () => {
    const pending = queueFieldEdit(queueFieldEdit([], weight(6)), weight(62))

    expect(pending).toEqual([weight(62)])
  })

  const reps = edit('reps', 8)
  const note = (text: string, date = DATE): FieldEdit => ({
    kind: 'note',
    date,
    workoutExerciseId: 'we1',
    note: text,
  })

  it.each<[string, FieldEdit]>([
    ['同一組的另一個欄位', reps],
    ['另一組的同一個欄位', weight(70, 's2')],
    ['同一個訓練動作的備註', note('左肩不適')],
    ['另一天的同一個欄位', { ...weight(62), date: '2026-10-23' }],
  ])('不同欄位（%s）的編輯都保留', (_, other) => {
    expect(queueFieldEdit([weight(60)], other)).toEqual([weight(60), other])
  })

  it('備註同樣以最後的值為準', () => {
    expect(queueFieldEdit([note('左肩')], note('左肩不適'))).toEqual([note('左肩不適')])
  })

  it('體重以日期區分，同一天以最後的值為準', () => {
    const otherDay = bodyWeight(71, '2026-10-23')
    expect(queueFieldEdit([bodyWeight(7), otherDay], bodyWeight(72))).toEqual([
      otherDay,
      bodyWeight(72),
    ])
  })
})

describe('settleFieldEdits：寫入完成後移除已寫入的編輯', () => {
  it('寫入期間沒有再改的欄位從待寫清單移除', () => {
    expect(settleFieldEdits([weight(62)], [weight(62)])).toEqual([])
  })

  it('寫入期間又改了值的欄位保留新的值，等下一次寫入', () => {
    expect(settleFieldEdits([weight(62.5)], [weight(62)])).toEqual([weight(62.5)])
  })

  it('寫入期間新增的其他欄位編輯保留', () => {
    const other = edit('reps', 8)

    expect(settleFieldEdits([weight(62), other], [weight(62)])).toEqual([other])
  })

  it('寫入期間改回寫入中的同一個值時，視為已寫入', () => {
    const pending = queueFieldEdit([weight(6)], weight(6))

    expect(settleFieldEdits(pending, [weight(6)])).toEqual([])
  })
})

describe('applyFieldEdits：把待寫的編輯套用到訓練', () => {
  const CREATED = '2026-10-24T01:00:00.000Z'
  const NOW = '2026-10-24T02:00:00.000Z'
  const workout: Workout = {
    date: DATE,
    exercises: [
      {
        id: 'we1',
        exerciseId: 'barbell-bench-press',
        note: '',
        sets: [
          { id: 's1', setType: 'regular', values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
          { id: 's2', setType: 'regular', values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
        ],
      },
    ],
    createdAt: CREATED,
    updatedAt: CREATED,
  }

  it('依序套用組的數值與備註，其他組不變', () => {
    const edits: FieldEdit[] = [
      weight(62.5),
      edit('reps', 6),
      { kind: 'note', date: DATE, workoutExerciseId: 'we1', note: '換了握法' },
    ]

    const result = applyFieldEdits(workout, edits, NOW)

    expect(result.updatedAt).toBe(NOW)
    expect(result.exercises[0].note).toBe('換了握法')
    expect(result.exercises[0].sets.map((set) => set.values)).toEqual([
      { type: 'weight_reps', weightKg: 62.5, reps: 6 },
      { type: 'weight_reps', weightKg: 60, reps: 8 },
    ])
  })

  it('清空欄位寫入 null', () => {
    const result = applyFieldEdits(workout, [weight(null)], NOW)

    expect(result.exercises[0].sets[0].values).toEqual({
      type: 'weight_reps',
      weightKg: null,
      reps: 8,
    })
  })

  it.each<[string, FieldEdit]>([
    ['該組已被刪除', weight(70, 'deleted-set')],
    ['該訓練動作已被刪除', { ...weight(70), workoutExerciseId: 'deleted' }],
    ['欄位不屬於該組的記錄類型', edit('addedWeightKg', 10)],
    ['另一天的編輯', { ...weight(70), date: '2026-10-23' }],
    ['體重不屬於訓練', bodyWeight(72)],
  ])('略過套用不到的編輯（%s），訓練不變', (_, edit) => {
    expect(applyFieldEdits(workout, [edit], NOW)).toBe(workout)
  })
})
