import {
  applyFieldEdits,
  queueFieldEdit,
  settleFieldEdits,
  type FieldEdit,
  type Workout,
} from '@/domain'
import type { WorkoutRepository } from '../repositories'
import type { MyRepBookDb, WorkoutRow } from './db'
import { notImplemented } from './notImplemented'
import { createLocalStoragePendingFieldEdits, type PendingFieldEdits } from './pendingFieldEdits'

/** 寫入時推導衍生欄位 exerciseIds：這筆訓練包含的動作 ID（去除重複） */
export function toWorkoutRow(workout: Workout): WorkoutRow {
  const exerciseIds = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))]
  return { ...workout, exerciseIds }
}

export function toWorkout({ exerciseIds: _exerciseIds, ...workout }: WorkoutRow): Workout {
  return workout
}

/**
 * 在 transaction 中把所有待寫的欄位編輯寫進 workouts（體重寫進 bodyWeights），
 * 接著執行 `work`（它讀到的是套用後的資料）。
 * commit 後才從待寫清單移除已寫入的編輯；transaction 失敗時編輯留在清單，之後再寫。
 */
async function writePendingThen<T>(
  db: MyRepBookDb,
  pending: PendingFieldEdits,
  work: () => Promise<T>,
): Promise<T> {
  let written: FieldEdit[] = []
  const result = await db.transaction('rw', db.workouts, db.bodyWeights, async () => {
    written = pending.read()
    const now = new Date().toISOString()
    for (const edit of written) {
      if (edit.kind !== 'bodyWeight') continue
      if (edit.weightKg === null) await db.bodyWeights.delete(edit.date)
      else await db.bodyWeights.put({ date: edit.date, weightKg: edit.weightKg, updatedAt: now })
    }
    const workoutDates = written
      .filter((edit) => edit.kind !== 'bodyWeight')
      .map((edit) => edit.date)
    for (const date of new Set(workoutDates)) {
      const row = await db.workouts.get(date)
      if (!row) continue
      const workout = toWorkout(row)
      const next = applyFieldEdits(workout, written, now)
      if (next !== workout) await db.workouts.put(toWorkoutRow(next))
    }
    return work()
  })
  pending.write(settleFieldEdits(pending.read(), written))
  return result
}

const nothing = () => Promise.resolve()

export function createDexieWorkoutRepository(
  db: MyRepBookDb,
  pending: PendingFieldEdits = createLocalStoragePendingFieldEdits(),
): WorkoutRepository {
  // 每次開啟資料庫時（例如重新整理後），先補寫上次沒寫完的欄位編輯；
  // Dexie 會等它完成才執行其他查詢，畫面不會先讀到舊的值
  db.on(
    'ready',
    (vipDb) =>
      writePendingThen(vipDb as MyRepBookDb, pending, nothing).catch((error: unknown) => {
        console.error('補寫欄位編輯失敗', error)
      }),
    true,
  )

  // 所有寫入排成一列：同一時間最多只有一筆寫入在進行
  let queue: Promise<unknown> = Promise.resolve()
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task)
    queue = run.catch(() => undefined)
    return run
  }

  function write<T>(work: () => Promise<T>): Promise<T> {
    return enqueue(() => writePendingThen(db, pending, work))
  }

  // 排隊中、還沒開始的欄位編輯寫入；開始前再有新的編輯時沿用它，寫入的是開始當下最後的值
  let queuedFlush: Promise<void> | undefined
  function flushFieldEdits(): Promise<void> {
    queuedFlush ??= enqueue(() => {
      queuedFlush = undefined
      return writePendingThen(db, pending, nothing)
    })
    return queuedFlush
  }

  return {
    async getByDate(date) {
      const row = await db.workouts.get(date)
      return row && toWorkout(row)
    },

    save(workout) {
      return write(async () => {
        await db.workouts.put(toWorkoutRow(workout))
      })
    },

    update(date, change) {
      return write(async () => {
        const row = await db.workouts.get(date)
        const next = change(row && toWorkout(row))
        if (next) await db.workouts.put(toWorkoutRow(next))
        else await db.workouts.delete(date)
      })
    },

    editField(edit) {
      pending.write(queueFieldEdit(pending.read(), edit))
      flushFieldEdits().catch((error: unknown) => {
        console.error('寫入欄位編輯失敗，留待之後補寫', error)
      })
    },

    flushFieldEdits,

    delete: notImplemented('WorkoutRepository.delete'),
    async listByExercise(exerciseId, { before, limit, offset = 0 } = {}) {
      // multiEntry 索引只能比對動作 ID，先取出日期（主鍵）篩選、排序與分頁，再只讀需要的那幾筆
      const dates = await db.workouts.where('exerciseIds').equals(exerciseId).primaryKeys()
      const page = dates
        .filter((date) => before === undefined || date < before)
        .sort((a, b) => b.localeCompare(a))
        .slice(offset, limit === undefined ? undefined : offset + limit)
      const rows = await db.workouts.bulkGet(page)
      return rows.filter((row) => row !== undefined).map(toWorkout)
    },

    async listDatesInRange(from, to) {
      return db.workouts.where('date').between(from, to, true, true).primaryKeys()
    },

    async listInRange(from, to) {
      const rows = await db.workouts.where('date').between(from, to, true, true).toArray()
      return rows.map(toWorkout)
    },

    async hasAnyWithExercise(exerciseId) {
      return (await db.workouts.where('exerciseIds').equals(exerciseId).count()) > 0
    },

    async listRecent({ limit, offset = 0 }) {
      const rows = await db.workouts.orderBy('date').reverse().offset(offset).limit(limit).toArray()
      return rows.map(toWorkout)
    },
  }
}
