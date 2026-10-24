import { zodResolver } from '@hookform/resolvers/zod'
import { useId, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CustomExerciseInput } from '@/data'
import {
  EQUIPMENTS,
  EQUIPMENT_LABELS,
  MUSCLES,
  MUSCLE_LABELS,
  TRACKING_TYPES,
  TRACKING_TYPE_LABELS,
  type ExerciseBase,
  type Muscle,
} from '@/domain'
import { customExerciseSchema, type CustomExerciseFormValues } from './customExerciseSchema'

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}

function TextField({
  label,
  error,
  children,
}: {
  label: string
  error: string | undefined
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/** 部位多選：依 MUSCLES 的順序保存，不受勾選順序影響 */
function MuscleCheckboxGroup({
  legend,
  value,
  onChange,
  error,
}: {
  legend: string
  value: readonly Muscle[]
  onChange: (muscles: Muscle[]) => void
  error: string | undefined
}) {
  const id = useId()
  const errorId = `${id}-error`
  const toggle = (muscle: Muscle, checked: boolean) =>
    onChange(MUSCLES.filter((m) => (m === muscle ? checked : value.includes(m))))

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-3 gap-x-2">
        {MUSCLES.map((muscle) => (
          <div key={muscle} className="flex min-h-11 items-center gap-2">
            <Checkbox
              id={`${id}-${muscle}`}
              checked={value.includes(muscle)}
              onCheckedChange={(checked) => toggle(muscle, checked === true)}
              aria-invalid={error !== undefined}
            />
            <Label htmlFor={`${id}-${muscle}`} className="font-normal">
              {MUSCLE_LABELS[muscle]}
            </Label>
          </div>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  )
}

function SingleChoiceGroup<T extends string>({
  legend,
  options,
  labels,
  value,
  onChange,
  error,
  disabledHint,
}: {
  legend: string
  options: readonly T[]
  labels: Readonly<Record<T, string>>
  value: string
  onChange: (value: string) => void
  error: string | undefined
  /** 有值時停用整組選項，並顯示這段說明 */
  disabledHint?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [disabledHint && hintId, error && errorId].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-legend`} className="mb-2 text-sm font-medium">
        {legend}
      </span>
      {disabledHint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {disabledHint}
        </p>
      )}
      <RadioGroup
        aria-labelledby={`${id}-legend`}
        aria-describedby={describedBy || undefined}
        aria-invalid={error !== undefined}
        disabled={disabledHint !== undefined}
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-2 gap-x-2 gap-y-0"
      >
        {options.map((option) => (
          <div key={option} className="flex min-h-11 items-center gap-2">
            <RadioGroupItem id={`${id}-${option}`} value={option} />
            <Label htmlFor={`${id}-${option}`} className="font-normal">
              {labels[option]}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/** 「取消」的行為：連到某個路由（獨立頁面），或交給呼叫端處理（例如在加入動作選單中返回清單） */
type CancelAction =
  { cancelTo: string; onCancel?: never } | { onCancel: () => void; cancelTo?: never }

/** 新增與編輯自訂動作共用的表單 */
export function CustomExerciseForm({
  defaultValues,
  existing,
  excludeId,
  cancelTo,
  onCancel,
  trackingTypeLocked = false,
  onSubmit,
}: {
  defaultValues: CustomExerciseFormValues
  /** 用於重名檢查的所有既有動作（預設＋自訂） */
  existing: readonly ExerciseBase[]
  /** 編輯時排除動作自己 */
  excludeId?: string
  /** 動作已有紀錄時鎖定記錄類型，避免舊資料的欄位對不上 */
  trackingTypeLocked?: boolean
  onSubmit: (input: CustomExerciseInput) => Promise<void>
} & CancelAction) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomExerciseFormValues, unknown, CustomExerciseInput>({
    defaultValues,
    mode: 'onTouched',
    resolver: zodResolver(customExerciseSchema(existing, { excludeId })),
  })

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <TextField label="中文名稱" error={errors.nameZh?.message}>
        {(props) => <Input {...props} {...register('nameZh')} className="h-11" />}
      </TextField>
      <TextField label="英文名稱" error={errors.nameEn?.message}>
        {(props) => <Input {...props} {...register('nameEn')} className="h-11" />}
      </TextField>

      <Controller
        control={control}
        name="primaryMuscles"
        render={({ field }) => (
          <MuscleCheckboxGroup
            legend="主要部位"
            value={field.value}
            onChange={field.onChange}
            error={errors.primaryMuscles?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="secondaryMuscles"
        render={({ field }) => (
          <MuscleCheckboxGroup
            legend="次要部位"
            value={field.value}
            onChange={field.onChange}
            error={errors.secondaryMuscles?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="equipment"
        render={({ field }) => (
          <SingleChoiceGroup
            legend="器材"
            options={EQUIPMENTS}
            labels={EQUIPMENT_LABELS}
            value={field.value}
            onChange={field.onChange}
            error={errors.equipment?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="trackingType"
        render={({ field }) => (
          <SingleChoiceGroup
            legend="記錄類型"
            options={TRACKING_TYPES}
            labels={TRACKING_TYPE_LABELS}
            value={field.value}
            onChange={field.onChange}
            error={errors.trackingType?.message}
            disabledHint={trackingTypeLocked ? '已有紀錄，無法變更記錄類型' : undefined}
          />
        )}
      />

      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1" disabled={isSubmitting}>
          儲存
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onCancel}>
            取消
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-11 flex-1">
            <Link to={cancelTo}>取消</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
