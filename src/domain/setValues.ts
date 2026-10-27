import { parseDuration } from './duration'
import type { ParsedInput, SetValues, TrackingType, WeightUnit } from './types'
import { kgToLb, toKg } from './units'

/** 該記錄類型所有欄位都還沒填的組數值 */
export function emptySetValues(type: TrackingType): SetValues {
  switch (type) {
    case 'weight_reps':
      return { type, weightKg: null, reps: null }
    case 'reps':
      return { type, reps: null, addedWeightKg: null }
    case 'duration':
      return { type, durationSec: null }
    case 'distance_duration':
      return { type, distanceKm: null, durationSec: null }
  }
}

/** 組的數值欄位（各記錄類型的欄位聯集） */
export type SetField = 'weightKg' | 'reps' | 'addedWeightKg' | 'durationSec' | 'distanceKm'

/** 各欄位的錯誤訊息；沒有錯誤的欄位不出現 */
export type SetFieldErrors = Partial<Record<SetField, string>>

/** 完整的組必須填寫的欄位；`reps` 類型的額外負重是選填 */
const REQUIRED_FIELDS: Readonly<Record<TrackingType, readonly SetField[]>> = {
  weight_reps: ['weightKg', 'reps'],
  reps: ['reps'],
  duration: ['durationSec'],
  distance_duration: ['distanceKm', 'durationSec'],
}

const MAX_REPS = 9999
const MAX_DURATION_SEC = 999 * 60 + 59
const MAX_DECIMALS = 2
const DECIMAL_TEXT = /^-?(\d+\.?\d*|\.\d+)$/
const REPS_ERROR = '請輸入 1–9999 的整數'

function hasAtMostTwoDecimals(value: number) {
  const scaled = value * 10 ** MAX_DECIMALS
  return Math.abs(scaled - Math.round(scaled)) < 1e-9
}

/** 已解析成數字的欄位值是否合法；回傳錯誤訊息，合法時回傳 undefined */
function checkValue(field: SetField, value: number): string | undefined {
  switch (field) {
    case 'reps':
      return Number.isInteger(value) && value >= 1 && value <= MAX_REPS ? undefined : REPS_ERROR
    case 'durationSec':
      if (!Number.isInteger(value)) return '時間須為整數秒'
      if (value <= 0) return '時間須大於 0'
      if (value > MAX_DURATION_SEC) return '時間須在 999:59 以內'
      return undefined
    case 'weightKg':
    case 'addedWeightKg':
    case 'distanceKm':
      if (!Number.isFinite(value)) return '請輸入數字'
      if (value < 0) return '不可小於 0'
      // 重量以 kg 儲存，lb 換算後的小數位數不受限制；小數位數只在輸入時檢查
      if (field === 'distanceKm' && !hasAtMostTwoDecimals(value)) return '最多 2 位小數'
      return undefined
  }
}

/** 重量、額外負重、距離：≥ 0，最多 2 位小數；允許輸入到一半的「62.」 */
export function parseDecimal(text: string): ParsedInput {
  if (!DECIMAL_TEXT.test(text)) return { ok: false, error: '請輸入數字' }
  if (text.startsWith('-')) return { ok: false, error: '不可小於 0' }
  const decimals = text.split('.')[1] ?? ''
  if (decimals.length > MAX_DECIMALS) return { ok: false, error: '最多 2 位小數' }
  return { ok: true, value: Number(text) }
}

function parseReps(text: string): ParsedInput {
  if (!/^\d+$/.test(text)) return { ok: false, error: REPS_ERROR }
  const value = Number(text)
  const error = checkValue('reps', value)
  return error ? { ok: false, error } : { ok: true, value }
}

/**
 * 解析使用者在某個欄位輸入的文字。重量與額外負重以 `weightUnit` 輸入，
 * 小數位數以輸入的單位檢查，再換算成 kg（不四捨五入）；距離固定為 km。
 * 空白為 null，代表尚未填寫；不合法時回傳錯誤訊息，呼叫端不應寫入。
 */
export function parseSetInput(field: SetField, text: string, weightUnit: WeightUnit): ParsedInput {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  switch (field) {
    case 'durationSec':
      return parseDuration(trimmed)
    case 'reps':
      return parseReps(trimmed)
    case 'weightKg':
    case 'addedWeightKg': {
      const parsed = parseDecimal(trimmed)
      return parsed.ok && parsed.value !== null
        ? { ok: true, value: toKg(parsed.value, weightUnit) }
        : parsed
    }
    case 'distanceKm':
      return parseDecimal(trimmed)
  }
}

/** 組數值中該記錄類型擁有的欄位 */
function fieldsOf(values: SetValues): Partial<Record<SetField, number | null>> {
  const { type: _type, ...fields } = values
  return fields
}

/** 驗證組數值中已填寫的欄位；尚未填寫（null）的欄位不算錯誤 */
export function validateSetValues(values: SetValues): SetFieldErrors {
  const errors: SetFieldErrors = {}
  for (const [field, value] of Object.entries(fieldsOf(values)) as [SetField, number | null][]) {
    if (value === null) continue
    const error = checkValue(field, value)
    if (error) errors[field] = error
  }
  return errors
}

/** 完整的組：所有必填欄位都已填寫，而且數值合法 */
export function isCompleteSet(values: SetValues): boolean {
  const fields = fieldsOf(values)
  const filled = REQUIRED_FIELDS[values.type].every((field) => fields[field] != null)
  return filled && Object.keys(validateSetValues(values)).length === 0
}

/** 重量每按一下增減的量（以顯示單位計）：kg 2.5、lb 5 */
const WEIGHT_STEP: Readonly<Record<WeightUnit, number>> = { kg: 2.5, lb: 5 }

/** 可以用 −／+ 微調的欄位；時間與距離不提供 */
export function isSteppableField(field: SetField): field is 'weightKg' | 'addedWeightKg' | 'reps' {
  return field === 'weightKg' || field === 'addedWeightKg' || field === 'reps'
}

/**
 * 欄位按一下 −（`direction` 為 -1）或 +（1）後的值；重量以 kg 儲存。
 * 重量依 `weightUnit` 增減一階（kg 2.5、lb 5），從畫面上顯示的值開始算，結果不小於 0；
 * 次數增減 1，限制在 1–9999。尚未填寫（null）的欄位按 + 從 0 起算（次數為 1），按 − 維持 null。
 * 增減後和原本相同（已到上下限）時代表這個方向不能再按。
 */
export function stepSetValue(
  field: 'weightKg' | 'addedWeightKg' | 'reps',
  value: number | null,
  direction: 1 | -1,
  weightUnit: WeightUnit,
): number | null {
  if (field === 'reps') {
    if (value === null) return direction === 1 ? 1 : null
    return Math.min(MAX_REPS, Math.max(1, value + direction))
  }
  if (value === null) return direction === 1 ? toKg(WEIGHT_STEP[weightUnit], weightUnit) : null
  // 以顯示的精度（kg 0.01、lb 0.1）為基準，避免 lb 換算的小數誤差影響增減後的值
  const shown =
    weightUnit === 'lb' ? Math.round(kgToLb(value) * 10) / 10 : Math.round(value * 100) / 100
  const next = Math.max(0, Math.round((shown + direction * WEIGHT_STEP[weightUnit]) * 100) / 100)
  return next === shown ? value : toKg(next, weightUnit)
}

/** 把某個欄位改成 `value` 之後，這組是否從「不完整」變成「完整」；原本就完整的組不算 */
export function completesSet(values: SetValues, field: SetField, value: number | null): boolean {
  return !isCompleteSet(values) && isCompleteSet({ ...values, [field]: value } as SetValues)
}
