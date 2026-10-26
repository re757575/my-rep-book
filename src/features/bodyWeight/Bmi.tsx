import { calculateBmi, formatBmi } from '@/domain'
import { useSettings } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'

/** 依設定中的身高顯示 BMI，例如「BMI 22.9」；還沒填身高時不顯示 */
export function Bmi({ weightKg, className }: { weightKg: number; className?: string }) {
  const { heightCm } = useSettings()
  if (heightCm === null) return null
  return (
    <p className={cn('text-sm text-muted-foreground tabular-nums', className)}>
      BMI {formatBmi(calculateBmi(weightKg, heightCm))}
    </p>
  )
}
