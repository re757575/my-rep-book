import { useState } from 'react'
import { Input } from '@/components/ui/input'

/** 空白視為「尚未填寫」（null）；無法解析成數字時回傳 undefined，表示不寫入 */
function parseNumber(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

/**
 * 組的數字欄位：每次輸入就把解析後的值交給 `onChange`，沒有儲存按鈕。
 * 畫面上的文字由欄位自己保存，避免輸入到一半（例如「62.」）被儲存後的數值蓋掉。
 */
export function NumberField({
  label,
  inputMode,
  value,
  onChange,
}: {
  label: string
  inputMode: 'decimal' | 'numeric'
  value: number | null
  onChange: (value: number | null) => void
}) {
  const [text, setText] = useState(value === null ? '' : String(value))

  return (
    <Input
      type="text"
      inputMode={inputMode}
      aria-label={label}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        const parsed = parseNumber(event.target.value)
        if (parsed !== undefined) onChange(parsed)
      }}
      className="h-11 w-20 text-center"
    />
  )
}
