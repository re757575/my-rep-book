import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useRepositories } from '@/data'
import { parseHeightInput } from '@/domain'

/**
 * 身高（cm）：每次輸入就自動儲存，沒有儲存按鈕；清空即改回尚未填寫。
 * 不合法時在欄位下方顯示錯誤且不寫入。填寫後訓練頁與歷史會在體重旁顯示 BMI。
 */
export function HeightSection({ heightCm }: { heightCm: number | null }) {
  const { settings } = useRepositories()
  const id = useId()
  const [text, setText] = useState(heightCm === null ? '' : String(heightCm))
  const [error, setError] = useState<string>()

  return (
    <section className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="font-semibold">
        身高
      </h2>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          aria-labelledby={`${id}-title`}
          aria-invalid={error !== undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            const parsed = parseHeightInput(event.target.value)
            setError(parsed.ok ? undefined : parsed.error)
            if (parsed.ok) void settings.update({ heightCm: parsed.value })
          }}
          className="h-11 w-24 text-center"
        />
        <span className="text-sm text-muted-foreground">cm</span>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          用於計算 BMI
        </p>
      )}
    </section>
  )
}
