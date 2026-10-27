import { Button } from '@/components/ui/button'
import { effortOptionLabel, formatEffort, RPE_OPTIONS, type EffortScale } from '@/domain'

/**
 * 一組的強度（US-39）：5 個按鈕，RPE 是 6–10、RIR 是 4–0（位置對應同一個值）。
 * 按一下選取，再按同一個取消；`disabled` 時（訓練頁鎖定）仍看得出選了哪個。
 */
export function EffortPicker({
  setNumber,
  rpe,
  scale,
  disabled,
  onChange,
}: {
  setNumber: number
  rpe: number | undefined
  scale: EffortScale
  disabled: boolean
  onChange: (rpe: number | undefined) => void
}) {
  return (
    <div role="group" aria-label={`第 ${setNumber} 組強度`} className="flex flex-col gap-1">
      {/* 按鈕上只有數字，這一行說明它們是 RPE 還是 RIR */}
      <p aria-hidden="true" className="text-xs text-muted-foreground">
        {`強度（${scale === 'rir' ? 'RIR，還能再做幾下' : 'RPE，10 是做到極限'}）`}
      </p>
      <div className="flex gap-1">
        {RPE_OPTIONS.map((option) => {
          const pressed = rpe === option
          return (
            <Button
              key={option}
              variant={pressed ? 'default' : 'outline'}
              className="h-11 min-w-11 px-0"
              aria-label={`第 ${setNumber} 組 ${formatEffort(option, scale)}`}
              aria-pressed={pressed}
              disabled={disabled}
              onClick={() => onChange(pressed ? undefined : option)}
            >
              {effortOptionLabel(option, scale)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
