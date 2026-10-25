import { describe, expect, it } from 'vitest'
import type { LastPerformance } from './lastPerformance'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  cloneSetForNext,
  moveWorkoutExercise,
  removeSet,
  removeWorkoutExercise,
  restoreSet,
  restoreWorkoutExercise,
} from './workoutEdits'
import type { Workout, WorkoutExercise, WorkoutSet } from './types'

describe('cloneSetForNext：新增一組時複製上一組', () => {
  it.each<[string, WorkoutSet]>([
    [
      '正式組的重量×次數',
      { id: 'a', isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
    ],
    [
      '熱身組也保留熱身標記',
      { id: 'b', isWarmup: true, values: { type: 'weight_reps', weightKg: 40, reps: 10 } },
    ],
    [
      '不完整的組照樣複製空白欄位',
      { id: 'c', isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: null } },
    ],
    [
      '距離＋時間',
      {
        id: 'd',
        isWarmup: false,
        values: { type: 'distance_duration', distanceKm: 5, durationSec: 1500 },
      },
    ],
  ])('%s', (_, previousSet) => {
    const { id: _id, ...expected } = previousSet

    expect(cloneSetForNext(previousSet)).toEqual(expected)
  })
})

const CREATED = '2026-10-24T01:00:00.000Z'
const NOW = '2026-10-24T02:00:00.000Z'
const LATER = '2026-10-24T02:00:05.000Z'

function set(id: string, weightKg: number): WorkoutSet {
  return { id, isWarmup: false, values: { type: 'weight_reps', weightKg, reps: 8 } }
}

function workoutExercise(id: string, sets: WorkoutSet[] = [set(`${id}-1`, 60)]): WorkoutExercise {
  return { id, exerciseId: `exercise-${id}`, note: '', sets }
}

function workout(exercises: WorkoutExercise[]): Workout {
  return { date: '2026-10-24', exercises, createdAt: CREATED, updatedAt: CREATED }
}

const exerciseIds = (target: Workout | undefined) => target?.exercises.map((item) => item.id)
const setIds = (target: Workout, workoutExerciseId: string) =>
  target.exercises.find((item) => item.id === workoutExerciseId)?.sets.map((item) => item.id)

const LAST_PERFORMANCE: LastPerformance = {
  date: '2026-10-20',
  sets: [
    { type: 'weight_reps', weightKg: 60, reps: 8 },
    { type: 'weight_reps', weightKg: 62.5, reps: 6 },
  ],
}

function sequentialIds() {
  let next = 0
  return () => `new-${++next}`
}

const setsOf = (target: Workout, workoutExerciseId: string) =>
  target.exercises
    .find((item) => item.id === workoutExerciseId)
    ?.sets.map(({ isWarmup, values }) => ({ isWarmup, values }))

describe('addExerciseToWorkout：加入動作時第一組預填', () => {
  const bench = { id: 'barbell-bench-press', trackingType: 'weight_reps' } as const

  it('有上次紀錄時，第一組帶入上次第一個完整的正式組', () => {
    const result = addExerciseToWorkout(undefined, '2026-10-24', bench, LAST_PERFORMANCE, {
      now: NOW,
      createId: sequentialIds(),
    })

    expect(setsOf(result, 'new-1')).toEqual([
      { isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
    ])
  })

  it('沒有上次紀錄時，第一組欄位為空白', () => {
    const result = addExerciseToWorkout(
      workout([workoutExercise('a')]),
      '2026-10-24',
      bench,
      undefined,
      {
        now: NOW,
        createId: sequentialIds(),
      },
    )

    expect(setsOf(result, 'new-1')).toEqual([
      { isWarmup: false, values: { type: 'weight_reps', weightKg: null, reps: null } },
    ])
  })
})

describe('addSetToWorkoutExercise：新增一組', () => {
  const warmup: WorkoutSet = {
    id: 'a-1',
    isWarmup: true,
    values: { type: 'weight_reps', weightKg: 40, reps: 10 },
  }

  it('複製本次最後一組的數值與熱身標記，不看上次紀錄', () => {
    const result = addSetToWorkoutExercise(
      workout([workoutExercise('a', [set('a-0', 20), warmup])]),
      'a',
      'weight_reps',
      LAST_PERFORMANCE,
      { now: NOW, createId: sequentialIds() },
    )

    expect(setsOf(result, 'a')?.at(-1)).toEqual({
      isWarmup: true,
      values: { type: 'weight_reps', weightKg: 40, reps: 10 },
    })
  })

  it.each<[string, LastPerformance | undefined, WorkoutSet['values']]>([
    [
      '沒有任何組時，改用第一組預填的規則',
      LAST_PERFORMANCE,
      { type: 'weight_reps', weightKg: 60, reps: 8 },
    ],
    [
      '沒有任何組也沒有上次紀錄時，欄位為空白',
      undefined,
      { type: 'weight_reps', weightKg: null, reps: null },
    ],
  ])('%s', (_, lastPerformance, expected) => {
    const result = addSetToWorkoutExercise(
      workout([workoutExercise('a', [])]),
      'a',
      'weight_reps',
      lastPerformance,
      { now: NOW, createId: sequentialIds() },
    )

    expect(setsOf(result, 'a')).toEqual([{ isWarmup: false, values: expected }])
  })
})

describe('moveWorkoutExercise：上移與下移', () => {
  it.each([
    ['上移與前一個動作交換', 'b', 'up', ['b', 'a', 'c']],
    ['下移與後一個動作交換', 'b', 'down', ['a', 'c', 'b']],
    ['第一個動作上移時不變', 'a', 'up', ['a', 'b', 'c']],
    ['最後一個動作下移時不變', 'c', 'down', ['a', 'b', 'c']],
  ] as const)('%s', (_, id, direction, expected) => {
    const before = workout([workoutExercise('a'), workoutExercise('b'), workoutExercise('c')])

    expect(exerciseIds(moveWorkoutExercise(before, id, direction, NOW))).toEqual(expected)
  })
})

describe('removeSet／restoreSet：刪除一組與復原', () => {
  const bench = workoutExercise('bench', [set('s1', 60), set('s2', 62.5), set('s3', 65)])

  it('復原後回到原本的位置，數值和刪除前相同', () => {
    const { workout: afterDelete, removed } = removeSet(workout([bench]), 'bench', 's2', NOW)
    expect(setIds(afterDelete, 'bench')).toEqual(['s1', 's3'])

    const restored = restoreSet(afterDelete, removed!, LATER)

    expect(restored.exercises[0].sets).toEqual(bench.sets)
    expect(restored.updatedAt).toBe(LATER)
  })

  it.each([
    ['刪除後又刪了前面的組', 's1', ['s2', 's3']],
    ['刪除後又刪了後面的組', 's3', ['s1', 's2']],
  ])('%s，復原時仍放回原本的相對位置', (_, alsoDeleted, expected) => {
    const first = removeSet(workout([bench]), 'bench', 's2', NOW)
    const second = removeSet(first.workout, 'bench', alsoDeleted, NOW)

    expect(setIds(restoreSet(second.workout, first.removed!, LATER), 'bench')).toEqual(expected)
  })

  it('刪除後又新增了一組，復原的組放回原位，新增的組仍在最後面', () => {
    const { workout: afterDelete, removed } = removeSet(workout([bench]), 'bench', 's2', NOW)
    const withNewSet: Workout = {
      ...afterDelete,
      exercises: [
        { ...afterDelete.exercises[0], sets: [...afterDelete.exercises[0].sets, set('s4', 65)] },
      ],
    }

    expect(setIds(restoreSet(withNewSet, removed!, LATER), 'bench')).toEqual([
      's1',
      's2',
      's3',
      's4',
    ])
  })

  it('所屬的訓練動作已被刪除時，復原不改變訓練', () => {
    const other = workoutExercise('squat')
    const { workout: afterDelete, removed } = removeSet(workout([bench, other]), 'bench', 's1', NOW)
    const withoutBench = removeWorkoutExercise(afterDelete, 'bench', NOW).workout!

    expect(restoreSet(withoutBench, removed!, LATER)).toBe(withoutBench)
  })

  it('同一組復原兩次時，不會出現重複的組', () => {
    const { workout: afterDelete, removed } = removeSet(workout([bench]), 'bench', 's2', NOW)
    const restored = restoreSet(afterDelete, removed!, LATER)

    expect(setIds(restoreSet(restored, removed!, LATER), 'bench')).toEqual(['s1', 's2', 's3'])
  })

  it('找不到該組時訓練不變', () => {
    const before = workout([bench])

    expect(removeSet(before, 'bench', 'missing', NOW)).toEqual({
      workout: before,
      removed: undefined,
    })
  })
})

describe('removeWorkoutExercise／restoreWorkoutExercise：刪除動作與復原', () => {
  it('復原後回到原本的位置，各組與備註和刪除前相同', () => {
    const bench = { ...workoutExercise('bench'), note: '換了握法' }
    const before = workout([workoutExercise('a'), bench, workoutExercise('c')])

    const { workout: afterDelete, removed } = removeWorkoutExercise(before, 'bench', NOW)
    expect(exerciseIds(afterDelete)).toEqual(['a', 'c'])

    const restored = restoreWorkoutExercise(afterDelete, '2026-10-24', removed!, LATER)
    expect(restored.exercises).toEqual(before.exercises)
  })

  it('刪除最後一個動作時，整筆訓練一併刪除', () => {
    const { workout: afterDelete, removed } = removeWorkoutExercise(
      workout([workoutExercise('bench')]),
      'bench',
      NOW,
    )

    expect(afterDelete).toBeUndefined()
    expect(removed?.workoutExercise.id).toBe('bench')
  })

  it('整筆訓練被刪除後復原，一併還原該日的訓練與原本的建立時間', () => {
    const bench = workoutExercise('bench')
    const { removed } = removeWorkoutExercise(workout([bench]), 'bench', NOW)

    expect(restoreWorkoutExercise(undefined, '2026-10-24', removed!, LATER)).toEqual({
      date: '2026-10-24',
      exercises: [bench],
      createdAt: CREATED,
      updatedAt: LATER,
    })
  })

  it('刪除後又加入了其他動作，復原時放回原本的位置', () => {
    const before = workout([workoutExercise('a'), workoutExercise('b')])
    const { workout: afterDelete, removed } = removeWorkoutExercise(before, 'a', NOW)
    const withNew = {
      ...afterDelete!,
      exercises: [...afterDelete!.exercises, workoutExercise('new')],
    }

    const restored = restoreWorkoutExercise(withNew, '2026-10-24', removed!, LATER)

    expect(exerciseIds(restored)).toEqual(['a', 'b', 'new'])
  })

  it('刪除後又調整了其他動作的順序，復原時接在原本排在它前面的動作之後', () => {
    const before = workout([workoutExercise('a'), workoutExercise('b'), workoutExercise('c')])
    const { workout: afterDelete, removed } = removeWorkoutExercise(before, 'b', NOW)
    const reordered = moveWorkoutExercise(afterDelete!, 'c', 'up', NOW)

    const restored = restoreWorkoutExercise(reordered, '2026-10-24', removed!, LATER)

    expect(exerciseIds(restored)).toEqual(['c', 'a', 'b'])
  })

  it('同一個動作復原兩次時，不會出現重複的動作', () => {
    const before = workout([workoutExercise('a'), workoutExercise('b')])
    const { workout: afterDelete, removed } = removeWorkoutExercise(before, 'a', NOW)
    const restored = restoreWorkoutExercise(afterDelete, '2026-10-24', removed!, LATER)

    expect(exerciseIds(restoreWorkoutExercise(restored, '2026-10-24', removed!, LATER))).toEqual([
      'a',
      'b',
    ])
  })
})
