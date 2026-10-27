/** 組間休息的選項（秒） */
export const REST_DURATIONS_SEC = [45, 60, 90, 120, 180] as const
export const DEFAULT_REST_DURATION_SEC = 90

/** 休息結束後，仍顯示「休息結束」並可發出提醒的時間（毫秒） */
export const REST_FINISHED_VISIBLE_MS = 10_000

/** 倒數中的休息：`endsAt` 是結束時刻（epoch 毫秒） */
export interface RestTimer {
  endsAt: number
  /** 結束時的震動與通知是否已經發出，避免重新整理後又發一次 */
  alerted: boolean
}

export type RestTimerPhase =
  { kind: 'idle' } | { kind: 'running'; remainingSec: number } | { kind: 'finished' }

/** 從現在開始休息 `durationSec` 秒 */
export function startRest(durationSec: number, now: number): RestTimer {
  return { endsAt: now + durationSec * 1000, alerted: false }
}

/**
 * 計時器此刻的階段：倒數中、剛結束（`REST_FINISHED_VISIBLE_MS` 內），或沒有。
 * 剩餘秒數無條件進位，所以倒數到 0:01 才會結束。
 */
export function restTimerPhase(timer: RestTimer | null, now: number): RestTimerPhase {
  if (!timer) return { kind: 'idle' }
  const remainingMs = timer.endsAt - now
  if (remainingMs > 0) return { kind: 'running', remainingSec: Math.ceil(remainingMs / 1000) }
  return remainingMs > -REST_FINISHED_VISIBLE_MS ? { kind: 'finished' } : { kind: 'idle' }
}

/** 倒數中的計時器增減 `deltaSec` 秒；最少保留 1 秒。已經結束的計時器不能再調整，回傳原值 */
export function adjustRest(timer: RestTimer, deltaSec: number, now: number): RestTimer {
  if (timer.endsAt <= now) return timer
  return { ...timer, endsAt: Math.max(now + 1000, timer.endsAt + deltaSec * 1000) }
}

/** 剩餘時間顯示成 `m:ss`，例如 `1:30`、`0:05` */
export function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** 設定頁的休息時間選項，例如 `45 秒`、`1 分`、`1 分 30 秒` */
export function formatRestDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} 秒`
  return seconds === 0 ? `${minutes} 分` : `${minutes} 分 ${seconds} 秒`
}
