import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatDuration, parseSetInput, type SetField } from '@/domain'

const INPUT_MODES: Readonly<Record<SetField, 'decimal' | 'numeric'>> = {
  weightKg: 'decimal',
  reps: 'numeric',
  addedWeightKg: 'decimal',
  durationSec: 'numeric',
  distanceKm: 'decimal',
}

function formatValue(field: SetField, value: number | null) {
  if (value === null) return ''
  return field === 'durationSec' ? formatDuration(value) : String(value)
}

/**
 * 組的一個數值欄位：每次輸入就把合法的值交給 `onChange`，沒有儲存按鈕。
 * 不合法時在欄位下方顯示錯誤且不寫入，儲存的仍是上一個合法值或 null。
 * 畫面上的文字由欄位自己保存，避免輸入到一半（例如「62.」）被儲存後的數值蓋掉。
 */
export function SetValueInput({
  field,
  label,
  placeholder,
  value,
  onChange,
}: {
  field: SetField
  label: string
  placeholder?: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  const errorId = useId()
  const [text, setText] = useState(() => formatValue(field, value))
  const [error, setError] = useState<string>()

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="text"
        inputMode={INPUT_MODES[field]}
        aria-label={label}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = parseSetInput(field, event.target.value)
          setError(parsed.ok ? undefined : parsed.error)
          if (parsed.ok) onChange(parsed.value)
        }}
        className="h-11 w-20 text-center"
      />
      {error && (
        <p id={errorId} className="w-20 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
