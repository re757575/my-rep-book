import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useWorkoutReadOnly } from './workoutReadOnly'

/**
 * 訓練動作的備註：每次輸入就交給 `onChange` 自動儲存，沒有儲存按鈕。
 * 畫面上的文字由欄位自己保存，避免儲存後的資料回流時打斷輸入（例如注音選字中）。
 * 訓練頁鎖定時唯讀；沒有備註就不顯示欄位。
 */
export function ExerciseNoteField({
  note,
  onChange,
}: {
  note: string
  onChange: (note: string) => void
}) {
  const [text, setText] = useState(note)
  const readOnly = useWorkoutReadOnly()

  if (readOnly && text.trim() === '') return null
  return (
    <Textarea
      aria-label="備註"
      placeholder="備註（例如：左肩不適、換了握法）"
      readOnly={readOnly}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onChange(event.target.value)
      }}
      rows={1}
      className="min-h-11"
    />
  )
}
