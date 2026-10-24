import { useLiveData } from '@/data'
import type { LibraryExercise } from '@/domain'

/** 動作庫的全部動作（預設＋自訂，含已隱藏、已封存）；載入中為 undefined */
export function useLibraryExercises(): LibraryExercise[] | undefined {
  return useLiveData((repositories) => repositories.exercises.listAll(), [])
}

/** 依 ID 取得動作庫中的動作；載入中為 undefined，找不到為 null */
export function useLibraryExercise(id: string): LibraryExercise | null | undefined {
  return useLiveData(
    async (repositories) =>
      (await repositories.exercises.listAll()).find((exercise) => exercise.id === id) ?? null,
    [id],
  )
}
