import type { BrowseCategory, Equipment, Muscle, TrackingType } from './types'

/** 篩選分類的顯示名稱 */
export const BROWSE_CATEGORY_LABELS: Readonly<Record<BrowseCategory, string>> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  biceps: '手臂：二頭',
  triceps: '手臂：三頭',
  quads_glutes: '腿：股四頭／臀',
  hamstrings: '腿：腿後側',
  calves: '小腿',
  core: '核心／腹部',
  cardio_full_body: '有氧／全身',
}

/** 器材的顯示名稱 */
export const EQUIPMENT_LABELS: Readonly<Record<Equipment, string>> = {
  barbell: '槓鈴',
  dumbbell: '啞鈴',
  machine: '器械',
  cable: '繩索',
  bodyweight: '徒手',
  kettlebell: '壺鈴',
  cardio_machine: '有氧器材',
  other: '其他',
}

/** 部位的顯示名稱 */
export const MUSCLE_LABELS: Readonly<Record<Muscle, string>> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  traps: '斜方肌',
  biceps: '二頭',
  triceps: '三頭',
  forearms: '前臂',
  quads: '股四頭',
  glutes: '臀',
  hamstrings: '腿後側',
  calves: '小腿',
  core: '核心',
  full_body: '有氧／全身',
}

/** 記錄類型的顯示名稱 */
export const TRACKING_TYPE_LABELS: Readonly<Record<TrackingType, string>> = {
  weight_reps: '重量×次數',
  reps: '次數',
  duration: '時間',
  distance_duration: '距離＋時間',
}
