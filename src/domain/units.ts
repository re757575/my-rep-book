import type { WeightUnit } from './types'

/** 1 lb 等於幾 kg（國際磅的定義值） */
export const KG_PER_LB = 0.45359237

/** lb 換算成 kg；不四捨五入，儲存用 */
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

/** 把使用者以顯示單位輸入的重量換算成 kg */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(value) : value
}

/** kg：最多 2 位小數（輸入的精度），不補零；lb：四捨五入到 0.1，固定顯示 1 位小數 */
const FRACTION_DIGITS: Readonly<
  Record<WeightUnit, { minimumFractionDigits: number; maximumFractionDigits: number }>
> = {
  kg: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
  lb: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
}

// 第一次用到時才建立並快取：模組層級的 new Intl.NumberFormat 是副作用，
// 會讓打包工具改變 chunk 的切分，首次載入的 JS 變大
const formatters = new Map<string, Intl.NumberFormat>()

function formatterFor(unit: WeightUnit, grouping: boolean) {
  const key = `${unit}|${grouping}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      ...FRACTION_DIGITS[unit],
      useGrouping: grouping,
    })
    formatters.set(key, formatter)
  }
  return formatter
}

/**
 * 以顯示單位顯示以 kg 儲存的重量（不含單位文字），例如 kg 的 `62.5`、lb 的 `135.0`。
 * `grouping` 為 true 時加上千分位，用於總訓練量這類可能很大的數字。
 */
export function formatWeight(
  kg: number,
  unit: WeightUnit,
  { grouping = false }: { grouping?: boolean } = {},
): string {
  const value = unit === 'lb' ? kgToLb(kg) : kg
  return formatterFor(unit, grouping).format(value)
}

const roundedFormatters = new Map<WeightUnit, Intl.NumberFormat>()

function roundedFormatterFor(unit: WeightUnit) {
  let formatter = roundedFormatters.get(unit)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: unit === 'lb' ? 1 : 0,
      maximumFractionDigits: 1,
      useGrouping: false,
    })
    roundedFormatters.set(unit, formatter)
  }
  return formatter
}

/**
 * 估算、平均這類算出來的重量（不含單位文字）：只顯示到 0.1，避免看起來比實際精確。
 * kg 不補零（例如 `76`、`77.3`），lb 與一般重量相同固定 1 位小數
 */
export function formatRoundedWeight(kg: number, unit: WeightUnit): string {
  return roundedFormatterFor(unit).format(unit === 'lb' ? kgToLb(kg) : kg)
}

/**
 * 重量的增減（不含單位文字），顯示到 0.1 並帶正負號，例如 `+0.4`、`-1.2`；
 * 四捨五入後為 0 時不帶正負號
 */
export function formatWeightChange(kg: number, unit: WeightUnit): string {
  const magnitude = formatRoundedWeight(Math.abs(kg), unit)
  if (Number(magnitude) === 0) return magnitude
  return `${kg > 0 ? '+' : '-'}${magnitude}`
}
