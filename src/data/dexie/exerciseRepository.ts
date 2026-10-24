import { PRESET_EXERCISES, type CustomExercise, type LibraryExercise } from '@/domain'
import type { ExerciseRepository } from '../repositories'
import type { CustomExerciseRow, MyRepBookDb } from './db'
import { notImplemented } from './notImplemented'

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

    createCustom: notImplemented('ExerciseRepository.createCustom'),
    updateCustom: notImplemented('ExerciseRepository.updateCustom'),
    archiveCustom: notImplemented('ExerciseRepository.archiveCustom'),
    unarchiveCustom: notImplemented('ExerciseRepository.unarchiveCustom'),
    deleteCustom: notImplemented('ExerciseRepository.deleteCustom'),
  }
}
