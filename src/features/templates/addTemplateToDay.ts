import { toast } from 'sonner'
import type { Repositories } from '@/data'
import {
  applyTemplate,
  removeWorkoutExercises,
  type LocalDate,
  type TemplateExerciseInfo,
  type WorkoutTemplate,
} from '@/domain'
import { queryLastPerformance } from '@/features/workout/queryLastPerformance'
import { showUndoToast } from './undoToast'

/**
 * 把範本的動作加到 `date` 的訓練最後面（US-41），顯示可以復原的 toast。
 * 每個動作依各自的上次紀錄預填第一組；動作庫裡找不到的動作略過，一個也加不了時什麼都不做。
 */
export async function addTemplateToDay(
  { workouts, exercises }: Pick<Repositories, 'workouts' | 'exercises'>,
  template: WorkoutTemplate,
  date: LocalDate,
) {
  const library = new Map((await exercises.listAll()).map((exercise) => [exercise.id, exercise]))
  const knownIds = [...new Set(template.exercises.map((item) => item.exerciseId))].filter((id) =>
    library.has(id),
  )
  const info = new Map<string, TemplateExerciseInfo>(
    await Promise.all(
      knownIds.map(async (exerciseId) => {
        const trackingType = library.get(exerciseId)!.trackingType
        const lastPerformance = await queryLastPerformance(workouts, exerciseId, date)
        return [exerciseId, { trackingType, lastPerformance }] as const
      }),
    ),
  )

  const added: { ids: string[] } = { ids: [] }
  await workouts.update(date, (current) => {
    const result = applyTemplate(template, current, date, info, {
      now: new Date().toISOString(),
      createId: () => crypto.randomUUID(),
    })
    added.ids = result.addedIds
    return result.workout
  })

  const addedIds = added.ids
  if (addedIds.length === 0) {
    toast('這個範本沒有可以加入的動作')
    return
  }
  showUndoToast(`已加入『${template.name}』的 ${addedIds.length} 個動作`, () =>
    workouts.update(
      date,
      (current) => current && removeWorkoutExercises(current, addedIds, new Date().toISOString()),
    ),
  )
}
