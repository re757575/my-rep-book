import { toast } from 'sonner'
import type { WorkoutRepository } from '@/data'
import { copyWorkoutExercises, removeWorkoutExercises, type Workout } from '@/domain'
import { today } from '@/features/workout/dayPath'

/** 可以「復原」的時間（毫秒），同刪除（`deleteWithUndo`） */
const UNDO_DURATION_MS = 5000

/**
 * 把 `source`（過去某天的訓練）複製到今天的訓練最後面（US-33），顯示可以復原的 toast。
 * 沒有任何可複製的動作時不新增，回傳 false。
 */
export async function copyWorkoutToToday(
  workouts: WorkoutRepository,
  source: Workout,
): Promise<boolean> {
  const date = today()
  const copied: { ids: string[] } = { ids: [] }
  await workouts.update(date, (current) => {
    const result = copyWorkoutExercises(source, current, date, {
      now: new Date().toISOString(),
      createId: () => crypto.randomUUID(),
    })
    copied.ids = result.copiedIds
    return result.workout
  })

  if (copied.ids.length === 0) {
    toast('這天沒有可複製的組')
    return false
  }
  const copiedIds = copied.ids
  toast(`已複製 ${copiedIds.length} 個動作到今天`, {
    duration: UNDO_DURATION_MS,
    action: {
      label: '復原',
      onClick: () =>
        void workouts.update(
          date,
          (current) =>
            current && removeWorkoutExercises(current, copiedIds, new Date().toISOString()),
        ),
    },
  })
  return true
}
