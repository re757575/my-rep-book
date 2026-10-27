import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { formatRestDuration, REST_DURATIONS_SEC } from '@/domain'
import { updateRestTimerSettings, useRestTimerSettings } from './restTimerStore'

/** 設定的一個開關：整列都是 label，點哪裡都能切換 */
function SwitchRow({
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

/** 這個瀏覽器能不能顯示通知 */
function canNotify() {
  return typeof Notification !== 'undefined'
}

/** 設定頁的「組間休息計時器」：開關、休息時間，以及時間到時的震動與通知 */
export function RestTimerSection() {
  const titleId = useId()
  const durationId = useId()
  const settings = useRestTimerSettings()
  const [notifyDenied, setNotifyDenied] = useState(
    () => canNotify() && Notification.permission === 'denied',
  )

  async function changeNotify(notify: boolean) {
    if (!notify) return updateRestTimerSettings({ notify: false })
    // 要在使用者點擊時詢問；被拒絕就維持關閉
    const permission = await Notification.requestPermission()
    setNotifyDenied(permission === 'denied')
    updateRestTimerSettings({ notify: permission === 'granted' })
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        組間休息計時器
      </h2>
      <SwitchRow
        label="新增一組或填完一組後自動倒數"
        checked={settings.enabled}
        onCheckedChange={(enabled) => updateRestTimerSettings({ enabled })}
      />
      <h3 id={durationId} className="text-sm text-muted-foreground">
        休息時間
      </h3>
      <RadioGroup
        aria-labelledby={durationId}
        value={String(settings.durationSec)}
        onValueChange={(value) => updateRestTimerSettings({ durationSec: Number(value) })}
        className="flex flex-wrap gap-x-6 gap-y-0"
      >
        {REST_DURATIONS_SEC.map((seconds) => (
          <div key={seconds} className="flex min-h-11 items-center gap-2">
            <RadioGroupItem id={`${durationId}-${seconds}`} value={String(seconds)} />
            <Label htmlFor={`${durationId}-${seconds}`} className="min-h-11 min-w-11 font-normal">
              {formatRestDuration(seconds)}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {'vibrate' in navigator && (
        <SwitchRow
          label="時間到時震動"
          checked={settings.vibrate}
          onCheckedChange={(vibrate) => updateRestTimerSettings({ vibrate })}
        />
      )}
      {canNotify() && (
        <SwitchRow
          label="時間到時通知"
          description={
            notifyDenied
              ? '瀏覽器已封鎖通知，請到瀏覽器或系統的網站設定開啟'
              : 'App 在背景時，倒數結束會跳出通知；手機被鎖定或 App 被系統暫停時可能延遲'
          }
          checked={settings.notify}
          disabled={notifyDenied}
          onCheckedChange={(notify) => void changeNotify(notify)}
        />
      )}
    </section>
  )
}
