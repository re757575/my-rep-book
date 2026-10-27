import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

/** 設定的一個開關：整列都是 label，點哪裡都能切換 */
export function SwitchRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Label htmlFor={id} className="min-h-11 flex-1 flex-col items-start justify-center gap-0">
        <span className="font-normal">{label}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}
