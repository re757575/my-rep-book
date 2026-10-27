/** 強度的顯示方式：RPE（自覺強度）或 RIR（還能再做幾下）；資料一律以 RPE 儲存（ADR 0007） */
export const EFFORT_SCALES = ['rpe', 'rir'] as const
export type EffortScale = (typeof EFFORT_SCALES)[number]

/** 輸入按鈕提供的 RPE，由輕到重；10 是做到極限 */
export const RPE_OPTIONS = [6, 7, 8, 9, 10] as const

/** 備份檔接受的 RPE 範圍 */
export const MIN_RPE = 1
export const MAX_RPE = 10

/** RIR = 10 − RPE：RPE 10 是做到極限（還能做 0 下） */
export function rpeToRir(rpe: number): number {
  return MAX_RPE - rpe
}

/** 強度的顯示，例如 `RPE 8`、`RIR 2` */
export function formatEffort(rpe: number, scale: EffortScale): string {
  return scale === 'rir' ? `RIR ${rpeToRir(rpe)}` : `RPE ${rpe}`
}

/** 輸入按鈕上的字：RPE 是 6–10，RIR 是 4–0 */
export function effortOptionLabel(rpe: number, scale: EffortScale): string {
  return String(scale === 'rir' ? rpeToRir(rpe) : rpe)
}

/** `rpe` 是合法的強度（MIN_RPE–MAX_RPE 的整數） */
export function isValidRpe(rpe: unknown): rpe is number {
  return Number.isInteger(rpe) && (rpe as number) >= MIN_RPE && (rpe as number) <= MAX_RPE
}
