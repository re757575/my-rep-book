import { useSyncExternalStore } from 'react'
import {
  adjustRest,
  DEFAULT_REST_DURATION_SEC,
  REST_DURATIONS_SEC,
  REST_FINISHED_VISIBLE_MS,
  restTimerPhase,
  startRest,
  type RestTimer,
} from '@/domain'

/**
 * 休息計時器的設定與倒數中的計時器。兩者都是畫面狀態，不是訓練資料：存在 localStorage，
 * 重新整理或換頁回來仍在，但不寫進資料庫，也不包含在備份檔中。
 * 狀態放在模組外（`useSyncExternalStore`），所以不論在哪個分頁都看得到同一個倒數。
 */

const SETTINGS_KEY = 'my-rep-book:rest-timer-settings'
const TIMER_KEY = 'my-rep-book:rest-timer'

export interface RestTimerSettings {
  enabled: boolean
  durationSec: number
  vibrate: boolean
  notify: boolean
}

const DEFAULT_SETTINGS: RestTimerSettings = {
  enabled: true,
  durationSec: DEFAULT_REST_DURATION_SEC,
  vibrate: true,
  notify: false,
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // localStorage 無法使用時，這次瀏覽期間不會記住
  }
}

function parseSettings(raw: string | null): RestTimerSettings {
  try {
    const parsed = JSON.parse(raw ?? 'null') as Partial<RestTimerSettings> | null
    return {
      enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      durationSec: (REST_DURATIONS_SEC as readonly unknown[]).includes(parsed?.durationSec)
        ? (parsed?.durationSec as number)
        : DEFAULT_SETTINGS.durationSec,
      vibrate: typeof parsed?.vibrate === 'boolean' ? parsed.vibrate : DEFAULT_SETTINGS.vibrate,
      notify: typeof parsed?.notify === 'boolean' ? parsed.notify : DEFAULT_SETTINGS.notify,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function parseTimer(raw: string | null): RestTimer | null {
  try {
    const parsed = JSON.parse(raw ?? 'null') as Partial<RestTimer> | null
    if (typeof parsed?.endsAt !== 'number' || !Number.isFinite(parsed.endsAt)) return null
    return { endsAt: parsed.endsAt, alerted: parsed.alerted === true }
  } catch {
    return null
  }
}

/** 同樣的儲存內容回傳同一個物件，`useSyncExternalStore` 才不會一直重新渲染 */
function cached<T>(parse: (raw: string | null) => T) {
  let last: { raw: string | null; value: T } | undefined
  return (raw: string | null) => {
    if (!last || last.raw !== raw) last = { raw, value: parse(raw) }
    return last.value
  }
}

const settingsOf = cached(parseSettings)
const timerOf = cached(parseTimer)

export function getRestTimerSettings(): RestTimerSettings {
  return settingsOf(readRaw(SETTINGS_KEY))
}

export function getRestTimer(): RestTimer | null {
  return timerOf(readRaw(TIMER_KEY))
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export function useRestTimerSettings(): RestTimerSettings {
  return useSyncExternalStore(subscribe, getRestTimerSettings)
}

export function useRestTimer(): RestTimer | null {
  return useSyncExternalStore(subscribe, getRestTimer)
}

export function updateRestTimerSettings(change: Partial<RestTimerSettings>) {
  writeRaw(SETTINGS_KEY, JSON.stringify({ ...getRestTimerSettings(), ...change }))
  notifyListeners()
}

function saveTimer(timer: RestTimer | null) {
  writeRaw(TIMER_KEY, timer && JSON.stringify(timer))
  notifyListeners()
}

/** 開始（或重新開始）倒數；設定關閉時什麼都不做 */
export function startRestTimerIfEnabled() {
  const settings = getRestTimerSettings()
  if (settings.enabled) saveTimer(startRest(settings.durationSec, Date.now()))
}

export function stopRestTimer() {
  saveTimer(null)
}

export function adjustRestTimer(deltaSec: number) {
  const timer = getRestTimer()
  if (timer) saveTimer(adjustRest(timer, deltaSec, Date.now()))
}

/**
 * 時間到時發出震動與通知，每個計時器只發一次。
 * 頁面在背景被暫停、很久之後才回來時，休息早就結束了，不再補發。
 */
export function alertRestFinished() {
  const timer = getRestTimer()
  if (!timer || timer.alerted) return
  const now = Date.now()
  if (restTimerPhase(timer, now).kind !== 'finished') return
  saveTimer({ ...timer, alerted: true })
  if (now - timer.endsAt >= REST_FINISHED_VISIBLE_MS) return

  const { vibrate, notify } = getRestTimerSettings()
  if (vibrate && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
  if (notify) void showNotification()
}

async function showNotification() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const title = '休息結束'
  const options = { body: '開始下一組', tag: 'rest-timer' }
  try {
    // Android 的 Chrome 只允許透過 Service Worker 顯示通知
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) await registration.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // 通知只是輔助，失敗時不影響使用
  }
}
