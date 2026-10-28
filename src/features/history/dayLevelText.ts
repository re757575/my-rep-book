import { DAY_LEVEL_RANGES, type DayLevel } from '@/domain'

/** 日期按鈕名稱的說明：不靠顏色或大小就讀得到 */
export const DAY_LEVEL_DESCRIPTIONS: Readonly<Record<DayLevel, string>> = {
  none: '尚未完成任何組',
  low: '組數少',
  medium: '組數中等',
  high: '組數多',
}

/** 圖例的文字：級別與組數範圍 */
export const DAY_LEVEL_LEGEND: Readonly<Record<DayLevel, string>> = {
  low: `少 ${DAY_LEVEL_RANGES.low[0]}–${DAY_LEVEL_RANGES.low[1]} 組`,
  medium: `中 ${DAY_LEVEL_RANGES.medium[0]}–${DAY_LEVEL_RANGES.medium[1]} 組`,
  high: `多 ${DAY_LEVEL_RANGES.high[0]} 組以上`,
  none: '尚未完成任何組',
}
