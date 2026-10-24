import type { BrowseCategory, ExerciseBase, Muscle } from './types'

/** 篩選分類 ← 主要部位 的映射表（PRD §5.4） */
export const CATEGORY_MUSCLES: Readonly<Record<BrowseCategory, readonly Muscle[]>> = {
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders', 'traps'],
  biceps: ['biceps', 'forearms'],
  triceps: ['triceps'],
  quads_glutes: ['quads', 'glutes'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
  core: ['core'],
  cardio_full_body: ['full_body'],
}

/** 動作的任一主要部位映射到該分類，就屬於該分類；次要部位不參與分類 */
export function exercisesInCategory<T extends ExerciseBase>(
  exercises: readonly T[],
  category: BrowseCategory,
): T[] {
  const muscles = CATEGORY_MUSCLES[category]
  return exercises.filter((exercise) =>
    exercise.primaryMuscles.some((muscle) => muscles.includes(muscle)),
  )
}
