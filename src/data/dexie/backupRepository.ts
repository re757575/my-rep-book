import { DEFAULT_SETTINGS, type BackupData } from '@/domain'
import type { BackupRepository, WorkoutRepository } from '../repositories'
import type { MyRepBookDb } from './db'
import { toCustomExercise, toCustomExerciseRow } from './exerciseRepository'
import type { PendingFieldEdits } from './pendingFieldEdits'
import { toWorkout, toWorkoutRow } from './workoutRepository'

export function createDexieBackupRepository(
  db: MyRepBookDb,
  { workouts, pending }: { workouts: WorkoutRepository; pending: PendingFieldEdits },
): BackupRepository {
  const allTables = [db.workouts, db.customExercises, db.hiddenPresets, db.settings]

  return {
    async exportAll() {
      // 剛輸入、還沒寫進資料庫的欄位編輯也要包含在備份中
      await workouts.flushFieldEdits()
      return db.transaction('r', allTables, async (): Promise<BackupData> => {
        const workoutRows = await db.workouts.orderBy('date').toArray()
        const customRows = await db.customExercises.toArray()
        const hiddenPresetIds = await db.hiddenPresets.toCollection().primaryKeys()
        const { weightUnit, theme } = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS
        return {
          workouts: workoutRows.map(toWorkout),
          customExercises: customRows
            .map(toCustomExercise)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          hiddenPresetIds,
          settings: { weightUnit, theme },
        }
      })
    },

    async replaceAll(data) {
      // 先寫入待寫的欄位編輯，之後的寫入佇列裡就沒有針對舊資料的編輯
      await workouts.flushFieldEdits()
      await db.transaction('rw', allTables, async () => {
        // 上次匯出時間屬於這台裝置，不隨匯入的內容改變
        const lastExportedAt = (await db.settings.get('settings'))?.lastExportedAt ?? null
        await Promise.all(allTables.map((table) => table.clear()))
        await db.workouts.bulkAdd(data.workouts.map(toWorkoutRow))
        await db.customExercises.bulkAdd(data.customExercises.map(toCustomExerciseRow))
        await db.hiddenPresets.bulkAdd(data.hiddenPresetIds.map((id) => ({ id })))
        await db.settings.put({ ...data.settings, lastExportedAt, key: 'settings' })
      })
      // 取代成功後才清空待寫清單：留下的編輯屬於舊資料，下次開啟時不能補寫到匯入的資料上
      pending.write([])
    },
  }
}
