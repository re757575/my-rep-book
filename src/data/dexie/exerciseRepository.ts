import {
  PRESET_EXERCISES,
  normalizeExerciseName,
  type CustomExercise,
  type LibraryExercise,
} from '@/domain'
import type { ExerciseRepository } from '../repositories'
import type { CustomExerciseRow, MyRepBookDb } from './db'
import { notImplemented } from './notImplemented'

function toRow(exercise: CustomExercise): CustomExerciseRow {
  return { ...exercise, nameKey: normalizeExerciseName(exercise.nameZh) }
}

function toCustomExercise({ nameKey: _nameKey, ...exercise }: CustomExerciseRow): CustomExercise {
  return exercise
}

export function createDexieExerciseRepository(db: MyRepBookDb): ExerciseRepository {
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
      await db.transaction('rw', db.customExercises, () => db.customExercises.add(toRow(exercise)))
      return exercise
    },

    async updateCustom(id, input) {
      await db.transaction('rw', db.customExercises, async () => {
        const row = await db.customExercises.get(id)
        if (!row) throw new Error(`找不到自訂動作 ${id}`)
        await db.customExercises.put(
          toRow({ ...toCustomExercise(row), ...input, updatedAt: new Date().toISOString() }),
        )
      })
    },

    archiveCustom: notImplemented('ExerciseRepository.archiveCustom'),
    unarchiveCustom: notImplemented('ExerciseRepository.unarchiveCustom'),
    deleteCustom: notImplemented('ExerciseRepository.deleteCustom'),
  }
}
