import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useRepositories } from '@/data'
import { THEMES, WEIGHT_UNITS, type Theme, type WeightUnit } from '@/domain'
import { BackupSection } from './BackupSection'
import { useStoredSettings } from './settingsContext'

const WEIGHT_UNIT_LABELS: Readonly<Record<WeightUnit, string>> = { kg: 'kg', lb: 'lb' }

const THEME_LABELS: Readonly<Record<Theme, string>> = {
  system: '跟隨系統',
  light: '淺色',
  dark: '深色',
}

/** 單選的設定：標題與一排選項，選了就立即儲存 */
function SettingOptions<T extends string>({
  title,
  options,
  labels,
  value,
  onChange,
}: {
  title: string
  options: readonly T[]
  labels: Readonly<Record<T, string>>
  value: T
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <section className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="font-semibold">
        {title}
      </h2>
      <RadioGroup
        aria-labelledby={`${id}-title`}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="flex flex-wrap gap-x-6 gap-y-0"
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
    </section>
  )
}

export function SettingsPage() {
  const repositories = useRepositories()
  const settings = useStoredSettings()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">設定</h1>
      {settings && (
        <>
          <SettingOptions
            title="重量單位"
            options={WEIGHT_UNITS}
            labels={WEIGHT_UNIT_LABELS}
            value={settings.weightUnit}
            onChange={(weightUnit) => repositories.settings.update({ weightUnit })}
          />
          <SettingOptions
            title="主題"
            options={THEMES}
            labels={THEME_LABELS}
            value={settings.theme}
            onChange={(theme) => repositories.settings.update({ theme })}
          />
          <BackupSection lastExportedAt={settings.lastExportedAt} />
        </>
      )}
    </div>
  )
}
