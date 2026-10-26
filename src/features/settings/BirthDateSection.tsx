import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useRepositories } from '@/data'
import { calculateAge, parseBirthDateInput, type LocalDate } from '@/domain'
import { today } from '@/features/workout/dayPath'

/**
 * 生日：用瀏覽器的日期選擇器輸入，選了就自動儲存，清空即改回尚未填寫。
 * 不合法或晚於今天時在欄位下方顯示錯誤且不寫入。AI 提示詞只帶入年齡，不放生日本身。
 */
export function BirthDateSection({ birthDate }: { birthDate: LocalDate | null }) {
  const { settings } = useRepositories()
  const id = useId()
  const [text, setText] = useState(birthDate ?? '')
  const [error, setError] = useState<string>()

  return (
    <section className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="font-semibold">
        生日
      </h2>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          max={today()}
          aria-labelledby={`${id}-title`}
          aria-invalid={error !== undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            const parsed = parseBirthDateInput(event.target.value, today())
            setError(parsed.ok ? undefined : parsed.error)
            if (parsed.ok) void settings.update({ birthDate: parsed.value })
          }}
          className="h-11 w-44"
        />
        {birthDate && !error && (
          <span className="text-sm text-muted-foreground">
            {calculateAge(birthDate, today())} 歲
          </span>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          用於 AI 提示詞，只會帶入年齡
        </p>
      )}
    </section>
  )
}
