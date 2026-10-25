import {
  PRESET_EXERCISES,
  normalizeExerciseName,
  type CustomExercise,
  type LibraryExercise,
} from '@/domain'
import type { ExerciseRepository } from '../repositories'
import type { CustomExerciseRow, MyRepBookDb } from './db'

export function toCustomExerciseRow(exercise: CustomExercise): CustomExerciseRow {
  return { ...exercise, nameKey: normalizeExerciseName(exercise.nameZh) }
}

export function toCustomExercise({
  nameKey: _nameKey,
  ...exercise
}: CustomExerciseRow): CustomExercise {
  return exercise
}

export function createDexieExerciseRepository(db: MyRepBookDb): ExerciseRepository {
  /** 更新自訂動作的部分欄位，並刷新更新時間 */
  async function patchCustom(id: string, patch: Partial<CustomExercise>) {
    await db.transaction('rw', db.customExercises, async () => {
      const row = await db.customExercises.get(id)
      if (!row) throw new Error(`找不到自訂動作 ${id}`)
      await db.customExercises.put(
        toCustomExerciseRow({
          ...toCustomExercise(row),
          ...patch,
          updatedAt: new Date().toISOString(),
        }),
      )
    })
  }

  return {
    listAll() {
      return db.transaction('r', db.hiddenPresets, db.customExercises, async () => {
        const hiddenIds = new Set(await db.hiddenPresets.toCollection().primaryKeys())
        const customRows = await db.customExercises.toArray()

        const presets: LibraryExercise[] = PRESET_EXERCISES.map((preset) => ({
          ...preset,
          hidden: hiddenIds.has(preset.id),
        }))
        const customs = customRows
          .map(toCustomExercise)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        return [...presets, ...customs]
      })
    },

    async hidePreset(presetId) {
      await db.transaction('rw', db.hiddenPresets, () => db.hiddenPresets.put({ id: presetId }))
    },

    async unhidePreset(presetId) {
      await db.transaction('rw', db.hiddenPresets, () => db.hiddenPresets.delete(presetId))
    },

    async createCustom(input) {
      const now = new Date().toISOString()
      const exercise: CustomExercise = {
        ...input,
        id: `custom-${crypto.randomUUID()}`,
        source: 'custom',
        archived: false,
        createdAt: now,
        updatedAt: now,
      }
      await db.transaction('rw', db.customExercises, () =>
        db.customExercises.add(toCustomExerciseRow(exercise)),
      )
      return exercise
    },

    updateCustom(id, input) {
      return patchCustom(id, input)
    },

    archiveCustom(id) {
      return patchCustom(id, { archived: true })
    },

    unarchiveCustom(id) {
      return patchCustom(id, { archived: false })
    },

    async deleteCustom(id) {
      await db.transaction('rw', db.customExercises, db.workouts, async () => {
        // 已有紀錄的動作只能封存，避免訓練引用到不存在的動作
        if ((await db.workouts.where('exerciseIds').equals(id).count()) > 0) {
          throw new Error(`自訂動作 ${id} 已有紀錄，無法刪除`)
        }
        await db.customExercises.delete(id)
      })
    },
  }
}
