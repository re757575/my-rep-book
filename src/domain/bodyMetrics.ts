import { parseDecimal } from './setValues'
import type { ParsedInput, WeightUnit } from './types'
import { toKg } from './units'

const MIN_HEIGHT_CM = 50
const MAX_HEIGHT_CM = 300
const HEIGHT_ERROR = `請輸入 ${MIN_HEIGHT_CM}–${MAX_HEIGHT_CM} 的數字`

/** 以 kg 儲存的體重是否合法：大於 0 */
export function isValidBodyWeightKg(kg: number): boolean {
  return Number.isFinite(kg) && kg > 0
}

/** 身高（cm）是否合法：50–300 */
export function isValidHeightCm(cm: number): boolean {
  return Number.isFinite(cm) && cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM
}

/**
 * 解析使用者輸入的體重：以 `weightUnit` 輸入，最多 2 位小數，換算成 kg（不四捨五入）。
 * 空白為 null，代表不記錄；不合法時回傳錯誤訊息，呼叫端不應寫入。
 */
export function parseBodyWeightInput(text: string, weightUnit: WeightUnit): ParsedInput {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  const parsed = parseDecimal(trimmed)
  if (!parsed.ok || parsed.value === null) return parsed
  if (parsed.value <= 0) return { ok: false, error: '須大於 0' }
  return { ok: true, value: toKg(parsed.value, weightUnit) }
}

/** 解析使用者輸入的身高（cm）：50–300，最多 2 位小數；空白為 null，代表尚未填寫 */
export function parseHeightInput(text: string): ParsedInput {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  const parsed = parseDecimal(trimmed)
  if (!parsed.ok || parsed.value === null) return parsed
  return isValidHeightCm(parsed.value) ? parsed : { ok: false, error: HEIGHT_ERROR }
}

/** BMI = 體重（kg）÷ 身高（m）² */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

/** BMI 四捨五入到 0.1，固定顯示 1 位小數，例如 `22.9` */
export function formatBmi(bmi: number): string {
  return bmi.toFixed(1)
}
