import { useSyncExternalStore } from 'react'
import { EFFORT_SCALES, type EffortScale } from '@/domain'

/**
 * 強度記錄（US-39）的偏好：要不要在訓練頁顯示強度的輸入列，以及用 RPE 還是 RIR 輸入與顯示。
 * 是畫面偏好，不是訓練資料：存在 localStorage，不寫進資料庫，也不包含在備份檔中。
 * 強度本身一律以 RPE 儲存（ADR 0007），這裡只決定怎麼呈現。
 */
const STORAGE_KEY = 'my-rep-book:effort-settings'

export interface EffortSettings {
  /** 訓練頁是否顯示強度的輸入列（預設關閉） */
  enabled: boolean
  scale: EffortScale
}

const DEFAULT_SETTINGS: EffortSettings = { enabled: false, scale: 'rpe' }

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parseSettings(raw: string | null): EffortSettings {
  try {
    const parsed = JSON.parse(raw ?? 'null') as Partial<EffortSettings> | null
    return {
      enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      scale: EFFORT_SCALES.includes(parsed?.scale as EffortScale)
        ? (parsed?.scale as EffortScale)
        : DEFAULT_SETTINGS.scale,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// 同樣的儲存內容回傳同一個物件，`useSyncExternalStore` 才不會一直重新渲染
let cached: { raw: string | null; settings: EffortSettings } | undefined
function getEffortSettings(): EffortSettings {
  const raw = readRaw()
  if (!cached || cached.raw !== raw) cached = { raw, settings: parseSettings(raw) }
  return cached.settings
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useEffortSettings(): EffortSettings {
  return useSyncExternalStore(subscribe, getEffortSettings)
}

export function updateEffortSettings(change: Partial<EffortSettings>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getEffortSettings(), ...change }))
  } catch {
    // localStorage 無法使用時，這次瀏覽期間不會記住
  }
  listeners.forEach((listener) => listener())
}
