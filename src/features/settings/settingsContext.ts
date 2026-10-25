import { createContext, use } from 'react'
import { DEFAULT_SETTINGS, type Settings, type WeightUnit } from '@/domain'

/** 目前的設定；載入中為 undefined。由 `SettingsProvider` 提供 */
export const SettingsContext = createContext<Settings | undefined>(undefined)

/** 已儲存的設定；載入中為 undefined。設定頁用它避免載入前先顯示預設值 */
export function useStoredSettings(): Settings | undefined {
  return use(SettingsContext)
}

/** 目前的設定；載入中先用預設值 */
export function useSettings(): Settings {
  return use(SettingsContext) ?? DEFAULT_SETTINGS
}

/** 目前的重量單位：所有顯示與輸入重量的地方都用它 */
export function useWeightUnit(): WeightUnit {
  return useSettings().weightUnit
}
