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

/**
 * 動作的任一主要部位映射到該分類，就屬於該分類；次要部位預設不參與分類。
 * `includeSecondary` 時也納入只有次要部位屬於該分類的動作，排在主要部位屬於該分類的後面，兩段各自維持原順序。
 */
export function exercisesInCategory<T extends ExerciseBase>(
  exercises: readonly T[],
  category: BrowseCategory,
  { includeSecondary = false }: { includeSecondary?: boolean } = {},
): T[] {
  const muscles = CATEGORY_MUSCLES[category]
  const inCategory = (list: readonly Muscle[]) => list.some((muscle) => muscles.includes(muscle))

  const primary = exercises.filter((exercise) => inCategory(exercise.primaryMuscles))
  if (!includeSecondary) return primary

  const secondaryOnly = exercises.filter(
    (exercise) => !inCategory(exercise.primaryMuscles) && inCategory(exercise.secondaryMuscles),
  )
  return [...primary, ...secondaryOnly]
}
