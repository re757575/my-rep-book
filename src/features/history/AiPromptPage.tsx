import { ChevronLeft, Copy } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLiveData } from '@/data'
import {
  PROMPT_WEEKS,
  buildExerciseRecords,
  buildTrainingPrompt,
  hasPromptData,
  promptRange,
  type ExerciseRecords,
  type PromptWeeks,
} from '@/domain'
import { useSettings } from '@/features/settings/settingsContext'
import { today } from '@/features/workout/dayPath'

/** 讀取產生提示詞需要的資料：期間內的訓練、動作庫、全部體重，以及期間內做過的重量×次數動作的個人紀錄 */
function usePromptData(from: string, to: string) {
  return useLiveData(
    async (repositories) => {
      const [workouts, library, bodyWeights] = await Promise.all([
        repositories.workouts.listInRange(from, to),
        repositories.exercises.listAll(),
        repositories.bodyWeights.listAll(),
      ])
      const exercises = new Map(library.map((exercise) => [exercise.id, exercise]))
      // 依第一次出現的順序（由舊到新），個人紀錄以全部歷史計算
      const weightRepsIds = [
        ...new Set(workouts.flatMap((workout) => workout.exercises.map((item) => item.exerciseId))),
      ].filter((id) => exercises.get(id)?.trackingType === 'weight_reps')
      const records = new Map<string, ExerciseRecords>()
      for (const id of weightRepsIds) {
        const record = buildExerciseRecords(await repositories.workouts.listByExercise(id), id)
        if (record) records.set(id, record)
      }
      return { workouts, exercises, bodyWeights, records }
    },
    [from, to],
  )
}

/**
 * AI 提示詞：把最近幾週的紀錄整理成提示詞，一鍵複製後貼到外部 AI 請它分析與建議。
 * 內容只寫進剪貼簿，App 不會把資料傳到任何地方。
 */
export function AiPromptPage() {
  const [weeks, setWeeks] = useState<PromptWeeks>(4)
  const [from, to] = promptRange(weeks, today())
  const data = usePromptData(from, to)
  const { weightUnit, heightCm } = useSettings()
  const textarea = useRef<HTMLTextAreaElement>(null)

  const prompt =
    data && hasPromptData({ from, to, ...data })
      ? buildTrainingPrompt({ from, to, weightUnit, heightCm, ...data })
      : undefined

  async function copy() {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      toast('已複製，可以貼到 AI 的對話中')
    } catch {
      // 瀏覽器不允許寫入剪貼簿時（例如非安全連線），選取全文讓使用者自己複製
      textarea.current?.select()
      toast('無法自動複製，請長按文字手動複製')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/history"
        className="-ml-2 flex min-h-11 w-max items-center gap-1 pr-2 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        返回歷史
      </Link>
      <h1 className="text-xl font-semibold">AI 提示詞</h1>
      <p className="text-sm text-muted-foreground">
        {
          '把最近的紀錄整理成提示詞，複製後貼到 ChatGPT、Claude 等 AI，請它分析並建議下週的訓練。內容只會複製到剪貼簿，不會傳送到任何地方。'
        }
      </p>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="期間"
        value={String(weeks)}
        // 再按一次已選的期間時 Radix 會給空字串，維持原本的選擇
        onValueChange={(next) => next && setWeeks(Number(next) as PromptWeeks)}
        className="w-max"
      >
        {PROMPT_WEEKS.map((option) => (
          <ToggleGroupItem key={option} value={String(option)} className="h-11 min-w-11 px-3">
            最近 {option} 週
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {data &&
        (prompt === undefined ? (
          <p className="py-4 text-center text-muted-foreground">這段期間沒有紀錄</p>
        ) : (
          <>
            <Button className="h-11" onClick={copy}>
              <Copy aria-hidden="true" />
              複製提示詞
            </Button>
            <Textarea
              ref={textarea}
              aria-label="提示詞"
              readOnly
              value={prompt}
              rows={16}
              className="text-base"
            />
          </>
        ))}
    </div>
  )
}
