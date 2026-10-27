import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { EFFORT_SCALES, type EffortScale } from '@/domain'
import { SwitchRow } from '@/features/settings/SwitchRow'
import { updateEffortSettings, useEffortSettings } from './effortStore'

const SCALE_LABELS: Readonly<Record<EffortScale, string>> = { rpe: 'RPE', rir: 'RIR' }

/** 設定頁的「強度記錄」（US-39）：要不要在訓練頁記每一組的強度，以及用 RPE 還是 RIR */
export function EffortSection() {
  const titleId = useId()
  const scaleId = useId()
  const settings = useEffortSettings()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        強度記錄
      </h2>
      <SwitchRow
        label="每一組可以記錄強度"
        description="RPE 是自覺強度（10 是做到極限），RIR 是還能再做幾下（RIR = 10 − RPE）。資料一律以 RPE 儲存"
        checked={settings.enabled}
        onCheckedChange={(enabled) => updateEffortSettings({ enabled })}
      />
      <h3 id={scaleId} className="text-sm text-muted-foreground">
        輸入與顯示方式
      </h3>
      <RadioGroup
        aria-labelledby={scaleId}
        value={settings.scale}
        onValueChange={(scale) => updateEffortSettings({ scale: scale as EffortScale })}
        className="flex flex-wrap gap-x-6 gap-y-0"
      >
        {EFFORT_SCALES.map((scale) => (
          <div key={scale} className="flex min-h-11 items-center gap-2">
            <RadioGroupItem id={`${scaleId}-${scale}`} value={scale} />
            <Label htmlFor={`${scaleId}-${scale}`} className="min-h-11 min-w-11 font-normal">
              {SCALE_LABELS[scale]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </section>
  )
}
