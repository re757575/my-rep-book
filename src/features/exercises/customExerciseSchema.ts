import { z } from 'zod'
import { EQUIPMENTS, MUSCLES, TRACKING_TYPES, hasDuplicateName, type ExerciseBase } from '@/domain'

/**
 * 自訂動作表單的驗證規則（PRD US-11）。重名檢查要和所有既有動作比對，
 * 編輯時以 `excludeId` 排除動作自己。
 */
export function customExerciseSchema(
  existing: readonly ExerciseBase[],
  { excludeId }: { excludeId?: string } = {},
) {
  return z
    .object({
      nameZh: z
        .string()
        .trim()
        .min(1, '請輸入中文名稱')
        .max(40, '中文名稱最多 40 字')
        .refine((name) => !hasDuplicateName(name, existing, { excludeId }), '已有同名動作'),
      nameEn: z
        .string()
        .trim()
        .max(60, '英文名稱最多 60 字')
        .transform((name) => (name === '' ? null : name)),
      primaryMuscles: z.array(z.enum(MUSCLES)).min(1, '至少選擇 1 個主要部位'),
      secondaryMuscles: z.array(z.enum(MUSCLES)),
      // 表單中「尚未選擇」是空字串
      equipment: z.string().pipe(z.enum(EQUIPMENTS, '請選擇器材')),
      trackingType: z.string().pipe(z.enum(TRACKING_TYPES, '請選擇記錄類型')),
    })
    .refine(
      ({ primaryMuscles, secondaryMuscles }) =>
        !secondaryMuscles.some((muscle) => primaryMuscles.includes(muscle)),
      { path: ['secondaryMuscles'], message: '次要部位不能和主要部位重複' },
    )
}

export type CustomExerciseFormValues = z.input<ReturnType<typeof customExerciseSchema>>

export const EMPTY_CUSTOM_EXERCISE_FORM: CustomExerciseFormValues = {
  nameZh: '',
  nameEn: '',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: '',
  trackingType: '',
}

/** 以既有動作的資料作為表單初始值 */
export function formValuesFrom(exercise: Omit<ExerciseBase, 'id'>): CustomExerciseFormValues {
  return {
    nameZh: exercise.nameZh,
    nameEn: exercise.nameEn ?? '',
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: exercise.equipment,
    trackingType: exercise.trackingType,
  }
}

/** 「複製為自訂動作」的初始值：帶入預設動作的資料，中文名稱改為「{原名}（自訂）」以避開重名 */
export function copyOfPresetFormValues(preset: Omit<ExerciseBase, 'id'>): CustomExerciseFormValues {
  return { ...formValuesFrom(preset), nameZh: `${preset.nameZh}（自訂）` }
}
