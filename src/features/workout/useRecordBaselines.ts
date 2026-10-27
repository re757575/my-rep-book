import { useEffect, useState } from 'react'
import type { WorkoutRepository } from '@/data'
import { buildRecordBaseline, type LocalDate, type RecordBaseline } from '@/domain'
import { whenIdleAfterLoad } from '@/lib/whenIdleAfterLoad'

/**
 * 各動作在 `date` 之前的最大重量與最高估算 1RM，訓練頁用來標示新紀錄（US-31）。
 * 動作每加入一個才讀一次，而且等頁面載入完、主執行緒閒置後才讀：這個動作的歷史可能有幾百筆，
 * 和開啟訓練頁、顯示上次紀錄同時讀會拖慢它們（PRD §7，1,000 筆訓練 < 100 ms），標示晚一點出現沒關係。
 * 不用 live query：live query 會在每次輸入（寫入今天的訓練）後重讀，
 * 而這裡要讀的是這個動作的全部歷史。代價是另一個分頁修改更早的紀錄後，要重新整理才會反映。
 * 之前沒有可計算的組時是 undefined（不標示）。
 */
export function useRecordBaselines(
  workouts: WorkoutRepository,
  date: LocalDate,
  exerciseIds: readonly string[],
): ReadonlyMap<string, RecordBaseline | undefined> {
  const [baselines, setBaselines] = useState<ReadonlyMap<string, RecordBaseline | undefined>>(
    new Map(),
  )
  const idsKey = JSON.stringify(exerciseIds)

  useEffect(() => {
    const ids = JSON.parse(idsKey) as string[]
    if (ids.length === 0) return
    let cancelled = false
    const cancelIdle = whenIdleAfterLoad(() => {
      void Promise.all(
        ids.map(
          async (exerciseId) =>
            [
              exerciseId,
              buildRecordBaseline(
                await workouts.listByExercise(exerciseId, { before: date }),
                exerciseId,
                date,
              ),
            ] as const,
        ),
      ).then((entries) => {
        if (!cancelled) setBaselines((previous) => new Map([...previous, ...entries]))
      })
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [workouts, date, idsKey])

  return baselines
}
