import { parseDuration } from './duration'
import type { ParsedInput, SetValues, TrackingType, WeightUnit } from './types'
import { toKg } from './units'

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
function parseDecimal(text: string): ParsedInput {
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
