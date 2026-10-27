import { Minus, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatDuration,
  formatWeight,
  isSteppableField,
  parseSetInput,
  stepSetValue,
  type SetField,
  type WeightUnit,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { useWorkoutReadOnly } from './workoutReadOnly'

const INPUT_MODES: Readonly<Record<SetField, 'decimal' | 'numeric'>> = {
  weightKg: 'decimal',
  reps: 'numeric',
  addedWeightKg: 'decimal',
  durationSec: 'numeric',
  distanceKm: 'decimal',
}

function formatValue(field: SetField, value: number | null, weightUnit: WeightUnit) {
  if (value === null) return ''
  switch (field) {
    case 'durationSec':
      return formatDuration(value)
    case 'weightKg':
    case 'addedWeightKg':
      return formatWeight(value, weightUnit)
    case 'reps':
    case 'distanceKm':
      return String(value)
  }
}

/**
 * 組的一個數值欄位：每次輸入就把欄位與合法的值交給 `onChange`，沒有儲存按鈕。
 * 不合法時在欄位下方顯示錯誤且不寫入，儲存的仍是上一個合法值或 null。
 * 畫面上的文字由欄位自己保存，避免輸入到一半（例如「62.」）被儲存後的數值蓋掉。
 * 重量以目前的重量單位輸入與顯示，交給 `onChange` 的一律是 kg；切換單位時欄位重新掛載，以新的單位顯示。
 * 重量與次數欄位下方有 −／+，單手不叫出鍵盤就能微調（`stepSetValue`）；鎖定時不顯示。
 */
export function SetValueInput(props: SetValueInputProps) {
  const weightUnit = useWeightUnit()
  return <SetValueInputField key={weightUnit} weightUnit={weightUnit} {...props} />
}

interface SetValueInputProps {
  field: SetField
  label: string
  placeholder?: string
  value: number | null
  onChange: (field: SetField, value: number | null) => void
}

function SetValueInputField({
  field,
  label,
  placeholder,
  value,
  onChange,
  weightUnit,
}: SetValueInputProps & { weightUnit: WeightUnit }) {
  const errorId = useId()
  const readOnly = useWorkoutReadOnly()
  const [text, setText] = useState(() => formatValue(field, value, weightUnit))
  // 最後一個合法的值。連按 −／+ 時，從這裡算而不是等寫入資料庫後回來的 `value`
  const [current, setCurrent] = useState(value)
  const [error, setError] = useState<string>()

  function step(direction: 1 | -1) {
    if (!isSteppableField(field)) return
    const next = stepSetValue(field, current, direction, weightUnit)
    setCurrent(next)
    setText(formatValue(field, next, weightUnit))
    setError(undefined)
    onChange(field, next)
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="text"
        inputMode={INPUT_MODES[field]}
        aria-label={label}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = parseSetInput(field, event.target.value, weightUnit)
          setError(parsed.ok ? undefined : parsed.error)
          if (parsed.ok) {
            setCurrent(parsed.value)
            onChange(field, parsed.value)
          }
        }}
        className="h-11 w-20 text-center"
      />
      {isSteppableField(field) && !readOnly && (
        // 兩個按鈕各 44 px 寬，比欄位寬，所以左右各縮 4 px 讓整體置中
        <div className="-mx-1 flex">
          {([-1, 1] as const).map((direction) => (
            <Button
              key={direction}
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`${direction === 1 ? '增加' : '減少'}${label}`}
              disabled={stepSetValue(field, current, direction, weightUnit) === current}
              onClick={() => step(direction)}
            >
              {direction === 1 ? <Plus aria-hidden="true" /> : <Minus aria-hidden="true" />}
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p id={errorId} className="w-20 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
