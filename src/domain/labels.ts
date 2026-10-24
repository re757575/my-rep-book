import type { BrowseCategory, Equipment } from './types'

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
