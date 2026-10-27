import { describe, expect, it } from 'vitest'
import {
  buildExerciseRecords,
  buildRecordBaseline,
  estimateOneRepMaxKg,
  findNewRecordSets,
} from './exerciseRecords'
import type { SetValues, Workout, WorkoutSet } from './types'

const T = '2026-10-01T00:00:00.000Z'
const BENCH = 'barbell-bench-press'

type FixtureSet = [weightKg: number | null, reps: number | null, warmup?: 'warmup']

function sets(items: FixtureSet[]): WorkoutSet[] {
  return items.map(([weightKg, reps, warmup], index) => ({
    id: `s-${index}`,
    isWarmup: warmup === 'warmup',
    values: { type: 'weight_reps', weightKg, reps },
  }))
}

/** 某一天的訓練：槓鈴臥推的組，可再加上其他動作 */
function workout(
  date: string,
  benchSets: FixtureSet[],
  others: { exerciseId: string; values: SetValues }[] = [],
): Workout {
  return {
    date,
    exercises: [
      { id: `${date}-bench`, exerciseId: BENCH, note: '', sets: sets(benchSets) },
      ...others.map(({ exerciseId, values }, index) => ({
        id: `${date}-${index}`,
        exerciseId,
        note: '',
        sets: [{ id: `${date}-${index}-1`, isWarmup: false, values }],
      })),
    ],
    createdAt: T,
    updatedAt: T,
  }
}

describe('estimateOneRepMaxKg：估算 1RM（Epley）', () => {
  it.each<[number, number, number]>([
    [60, 8, 76],
    [100, 3, 110],
    [100, 10, 133.33333333333334],
    [0, 10, 0],
  ])('%d kg × %d → %d kg', (weightKg, reps, expected) => {
    expect(estimateOneRepMaxKg({ weightKg, reps })).toBeCloseTo(expected, 10)
  })

  it('做 1 下時就是該重量', () => {
    expect(estimateOneRepMaxKg({ weightKg: 120, reps: 1 })).toBe(120)
  })
})

describe('buildExerciseRecords：個人紀錄與每一次的進度', () => {
  it('沒有紀錄時回傳 undefined', () => {
    expect(buildExerciseRecords([], BENCH)).toBeUndefined()
  })

  it('只有熱身組或不完整的組時回傳 undefined', () => {
    const only = workout('2026-10-20', [
      [40, 10, 'warmup'],
      [60, null],
      [null, 8],
    ])
    expect(buildExerciseRecords([only], BENCH)).toBeUndefined()
  })

  it('最大重量與估算 1RM 可以來自不同的組與不同的日子', () => {
    const records = buildExerciseRecords(
      [workout('2026-10-20', [[100, 1]]), workout('2026-10-10', [[80, 10]])],
      BENCH,
    )
    expect(records?.maxWeight).toEqual({ date: '2026-10-20', set: { weightKg: 100, reps: 1 } })
    // 80 × (1 + 10/30) = 106.67 > 100
    expect(records?.oneRepMax).toEqual({
      date: '2026-10-10',
      set: { weightKg: 80, reps: 10 },
      estimatedKg: 80 * (1 + 10 / 30),
    })
  })

  it('紀錄取第一次達到的日子；之後只是追平不算新紀錄', () => {
    const records = buildExerciseRecords(
      [workout('2026-10-10', [[60, 8]]), workout('2026-10-20', [[60, 8]])],
      BENCH,
    )
    expect(records?.maxWeight.date).toBe('2026-10-10')
    expect(records?.oneRepMax.date).toBe('2026-10-10')
    expect(records?.sessions.map((s) => [s.isMaxWeightRecord, s.isOneRepMaxRecord])).toEqual([
      [false, false],
      [false, false],
    ])
  })

  it('每一次的進度由新到舊：最重的一組、估算 1RM、訓練量與是否破紀錄', () => {
    const records = buildExerciseRecords(
      [
        workout('2026-10-10', [
          [40, 10, 'warmup'],
          [60, 8],
          [60, 6],
        ]),
        workout('2026-10-15', [[62.5, 5]]),
        workout('2026-10-20', [
          [60, 10],
          [57.5, 10],
        ]),
      ],
      BENCH,
    )
    expect(records?.sessions).toEqual([
      {
        date: '2026-10-20',
        topSet: { weightKg: 60, reps: 10 },
        estimatedOneRepMaxKg: 80,
        volumeKg: 1175,
        // 60×10 比不上 10/15 的 62.5，但 1RM 80 超過之前的 76
        isMaxWeightRecord: false,
        isOneRepMaxRecord: true,
      },
      {
        date: '2026-10-15',
        topSet: { weightKg: 62.5, reps: 5 },
        estimatedOneRepMaxKg: 62.5 * (1 + 5 / 30),
        volumeKg: 312.5,
        // 1RM 72.9 < 76
        isMaxWeightRecord: true,
        isOneRepMaxRecord: false,
      },
      {
        date: '2026-10-10',
        topSet: { weightKg: 60, reps: 8 },
        estimatedOneRepMaxKg: 76,
        volumeKg: 840,
        // 第一次訓練不算新紀錄
        isMaxWeightRecord: false,
        isOneRepMaxRecord: false,
      },
    ])
  })

  it('同重量時次數多的較好', () => {
    const records = buildExerciseRecords(
      [
        workout('2026-10-10', [[100, 3]]),
        workout('2026-10-20', [
          [100, 5],
          [100, 4],
        ]),
      ],
      BENCH,
    )
    expect(records?.maxWeight).toEqual({ date: '2026-10-20', set: { weightKg: 100, reps: 5 } })
    expect(records?.sessions[0]).toMatchObject({
      topSet: { weightKg: 100, reps: 5 },
      isMaxWeightRecord: true,
    })
  })

  it('同一天加入多次這個動作時合併計算；其他動作與沒有這個動作的日子略過', () => {
    const day = workout(
      '2026-10-20',
      [[60, 8]],
      [{ exerciseId: 'deadlift', values: { type: 'weight_reps', weightKg: 140, reps: 5 } }],
    )
    day.exercises.push({ id: 'again', exerciseId: BENCH, note: '', sets: sets([[70, 3]]) })
    const otherDay: Workout = { ...workout('2026-10-21', []), exercises: [] }

    const records = buildExerciseRecords([day, otherDay], BENCH)
    expect(records?.sessions).toHaveLength(1)
    expect(records?.sessions[0]).toMatchObject({
      topSet: { weightKg: 70, reps: 3 },
      volumeKg: 60 * 8 + 70 * 3,
    })
  })
})

describe('buildRecordBaseline／findNewRecordSets：記錄當下的新紀錄標示', () => {
  /** 10/15：62.5×5（1RM 72.9）、10/20：60×10（1RM 80）→ 最大重量 62.5×5、1RM 80 */
  const history = [workout('2026-10-15', [[62.5, 5]]), workout('2026-10-20', [[60, 10]])]
  const baseline = buildRecordBaseline(history, BENCH, '2026-10-24')

  it('基準取檢視日期之前的最大重量與最高 1RM；當天與之後的訓練不算', () => {
    expect(baseline).toEqual({ maxWeight: { weightKg: 62.5, reps: 5 }, oneRepMaxKg: 80 })
    const withLater = [
      ...history,
      workout('2026-10-24', [[100, 5]]),
      workout('2026-10-30', [[90, 5]]),
    ]
    expect(buildRecordBaseline(withLater, BENCH, '2026-10-24')).toEqual(baseline)
  })

  it('之前沒有可計算的組（沒做過、只有熱身或不完整的組）時沒有基準，也不標示', () => {
    expect(buildRecordBaseline([], BENCH, '2026-10-24')).toBeUndefined()
    const unusable = [
      workout('2026-10-20', [
        [100, 5, 'warmup'],
        [100, null],
      ]),
    ]
    expect(buildRecordBaseline(unusable, BENCH, '2026-10-24')).toBeUndefined()
    expect(findNewRecordSets(undefined, workout('2026-10-24', [[100, 5]]), BENCH).size).toBe(0)
  })

  it('比之前每一次都重標示「重量」，估算 1RM 更高標示「1RM」，可同時標示', () => {
    const today = workout('2026-10-24', [
      [65, 3], // 比 62.5 重；1RM 71.5 沒超過 80
      [60, 12], // 沒有更重；1RM 84 超過 80
      [70, 5], // 更重；1RM 81.7 沒有超過 84
      [80, 8], // 更重；1RM 101.3 超過 84
    ])
    expect(findNewRecordSets(baseline, today, BENCH)).toEqual(
      new Map([
        ['s-0', ['maxWeight']],
        ['s-1', ['oneRepMax']],
        ['s-2', ['maxWeight']],
        ['s-3', ['maxWeight', 'oneRepMax']],
      ]),
    )
  })

  it('追平不標示；同一天連續兩組一樣的只標示第一組', () => {
    const today = workout('2026-10-24', [
      [62.5, 5],
      [65, 5],
      [65, 5],
      [65, 4],
    ])
    expect(findNewRecordSets(baseline, today, BENCH)).toEqual(
      new Map([['s-1', ['maxWeight']]]), // 65×5 的 1RM 75.8 沒超過 80,
    )
  })

  it('同重量次數多算更重', () => {
    expect(findNewRecordSets(baseline, workout('2026-10-24', [[62.5, 6]]), BENCH)).toEqual(
      new Map([['s-0', ['maxWeight']]]),
    )
  })

  it('熱身組、不完整的組與其他動作不標示，也不影響後面的組', () => {
    const today = workout(
      '2026-10-24',
      [
        [100, 5, 'warmup'],
        [100, null],
        [70, 5],
      ],
      [{ exerciseId: 'deadlift', values: { type: 'weight_reps', weightKg: 200, reps: 5 } }],
    )
    // 70×5 的 1RM 81.7 超過 80
    expect(findNewRecordSets(baseline, today, BENCH)).toEqual(
      new Map([['s-2', ['maxWeight', 'oneRepMax']]]),
    )
  })

  it('同一天加入多次同一個動作時，依順序累計', () => {
    const today = workout('2026-10-24', [[65, 5]])
    today.exercises.push({
      id: 'again',
      exerciseId: BENCH,
      note: '',
      sets: [
        { id: 'again-1', isWarmup: false, values: { type: 'weight_reps', weightKg: 65, reps: 5 } },
      ],
    })
    expect(findNewRecordSets(baseline, today, BENCH)).toEqual(new Map([['s-0', ['maxWeight']]]))
  })

  it('與 buildExerciseRecords 一致：某天有組標示，動作歷史那天就有對應的新紀錄', () => {
    const days: [string, FixtureSet[]][] = [
      ['2026-10-01', [[50, 8]]],
      ['2026-10-05', [[50, 8]]], // 追平
      [
        '2026-10-10',
        [
          [45, 15],
          [50, 7],
        ],
      ], // 只有 1RM 更高
      ['2026-10-15', [[55, 5]]], // 更重
      ['2026-10-20', [[40, 5]]], // 都沒有
    ]
    const all = days.map(([date, items]) => workout(date, items))
    const sessions = buildExerciseRecords(all, BENCH)?.sessions ?? []
    for (const day of all) {
      const marks = [
        ...findNewRecordSets(buildRecordBaseline(all, BENCH, day.date), day, BENCH).values(),
      ].flat()
      const session = sessions.find((item) => item.date === day.date)
      expect(marks.includes('maxWeight'), day.date).toBe(session?.isMaxWeightRecord)
      expect(marks.includes('oneRepMax'), day.date).toBe(session?.isOneRepMaxRecord)
    }
  })
})
