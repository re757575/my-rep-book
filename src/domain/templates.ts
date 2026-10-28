import { buildInitialSet, type LastPerformance } from './lastPerformance'
import { isWarmupSet } from './setTypes'
import { cloneSetForNext, type EditContext } from './workoutEdits'
import type {
  LocalDate,
  Timestamp,
  TrackingType,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplate,
} from './types'

/** 範本名稱的長度上限（去掉前後空白後） */
export const MAX_TEMPLATE_NAME_LENGTH = 30

/** 範本裡每個動作的組數範圍 */
export const MIN_TEMPLATE_SETS = 1
export const MAX_TEMPLATE_SETS = 20

/** 在範本裡加入動作時的預設組數 */
export const DEFAULT_TEMPLATE_SETS = 3

export type ParsedTemplateName = { ok: true; value: string } | { ok: false; error: string }

/** 解析範本名稱輸入：去掉前後空白後必須有 1–30 個字；不合法時回傳錯誤訊息，呼叫端不應寫入 */
export function parseTemplateName(text: string): ParsedTemplateName {
  const name = text.trim()
  if (name === '') return { ok: false, error: '請輸入範本名稱' }
  if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
    return { ok: false, error: `名稱最多 ${MAX_TEMPLATE_NAME_LENGTH} 個字` }
  }
  return { ok: true, value: name }
}

function clampSetCount(count: number): number {
  return Math.min(MAX_TEMPLATE_SETS, Math.max(MIN_TEMPLATE_SETS, Math.round(count)))
}

/**
 * 把一天的訓練存成範本（US-40）：依順序記下動作，組數是該動作的正式組數
 * （熱身組不算，不論有沒有填完；至少 1 組、最多 20 組）。不記數值、組類型、強度與備註。
 * `name` 要先經過 `parseTemplateName`。
 */
export function buildTemplateFromWorkout(
  workout: Workout,
  name: string,
  { now, createId }: EditContext,
): WorkoutTemplate {
  return {
    id: createId(),
    name,
    exercises: workout.exercises.map((item) => ({
      id: createId(),
      exerciseId: item.exerciseId,
      setCount: clampSetCount(item.sets.filter((set) => !isWarmupSet(set)).length),
    })),
    createdAt: now,
    updatedAt: now,
  }
}

/** 範本的動作數與總組數 */
export function summarizeTemplate(template: WorkoutTemplate): {
  exerciseCount: number
  setCount: number
} {
  return {
    exerciseCount: template.exercises.length,
    setCount: template.exercises.reduce((sum, item) => sum + item.setCount, 0),
  }
}

/** 範本的一行摘要，例如「3 個動作 · 9 組」 */
export function formatTemplateSummary(template: WorkoutTemplate): string {
  const { exerciseCount, setCount } = summarizeTemplate(template)
  return `${exerciseCount} 個動作 · ${setCount} 組`
}

/** 套用範本時，一個動作需要知道的資訊：記錄類型與上次紀錄（US-02） */
export interface TemplateExerciseInfo {
  trackingType: TrackingType
  lastPerformance: LastPerformance | undefined
}

/**
 * 把範本的動作依順序加到 `target` 的最後面（US-41）；`target` 為 undefined 時建立 `date` 的訓練。
 * 每個動作建立範本記的組數：第一組依上次紀錄預填（US-02），其餘複製前一組（US-03）。
 * `info` 裡沒有的動作（找不到動作定義）略過；一個也加不了時 `target` 不變，`addedIds` 為空。
 */
export function applyTemplate(
  template: WorkoutTemplate,
  target: Workout | undefined,
  date: LocalDate,
  info: ReadonlyMap<string, TemplateExerciseInfo>,
  { now, createId }: EditContext,
): { workout: Workout | undefined; addedIds: string[] } {
  const added: WorkoutExercise[] = template.exercises.flatMap((item) => {
    const exerciseInfo = info.get(item.exerciseId)
    if (!exerciseInfo) return []
    const exerciseId = createId()
    const sets: WorkoutSet[] = []
    for (let index = 0; index < item.setCount; index++) {
      const previous = sets.at(-1)
      const next = previous
        ? cloneSetForNext(previous)
        : buildInitialSet(exerciseInfo.lastPerformance, exerciseInfo.trackingType)
      sets.push({ id: createId(), ...next })
    }
    return [{ id: exerciseId, exerciseId: item.exerciseId, note: '', sets }]
  })
  if (added.length === 0) return { workout: target, addedIds: [] }

  const addedIds = added.map((item) => item.id)
  if (!target) {
    return { workout: { date, exercises: added, createdAt: now, updatedAt: now }, addedIds }
  }
  return {
    workout: { ...target, exercises: [...target.exercises, ...added], updatedAt: now },
    addedIds,
  }
}

function updateTemplate(
  template: WorkoutTemplate,
  change: Partial<Pick<WorkoutTemplate, 'name' | 'exercises'>>,
  now: Timestamp,
): WorkoutTemplate {
  return { ...template, ...change, updatedAt: now }
}

/** 改範本名稱；`name` 要先經過 `parseTemplateName` */
export function renameTemplate(
  template: WorkoutTemplate,
  name: string,
  now: Timestamp,
): WorkoutTemplate {
  return updateTemplate(template, { name }, now)
}

/** 改某個動作的組數，夾在 1–20；找不到該動作時範本不變 */
export function setTemplateSetCount(
  template: WorkoutTemplate,
  templateExerciseId: string,
  setCount: number,
  now: Timestamp,
): WorkoutTemplate {
  if (!template.exercises.some((item) => item.id === templateExerciseId)) return template
  return updateTemplate(
    template,
    {
      exercises: template.exercises.map((item) =>
        item.id === templateExerciseId ? { ...item, setCount: clampSetCount(setCount) } : item,
      ),
    },
    now,
  )
}

/** 和相鄰的動作交換位置；已經在最前面（上移）或最後面（下移），或找不到該動作時範本不變 */
export function moveTemplateExercise(
  template: WorkoutTemplate,
  templateExerciseId: string,
  direction: 'up' | 'down',
  now: Timestamp,
): WorkoutTemplate {
  const from = template.exercises.findIndex((item) => item.id === templateExerciseId)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= template.exercises.length) return template

  const exercises = [...template.exercises]
  ;[exercises[from], exercises[to]] = [exercises[to], exercises[from]]
  return updateTemplate(template, { exercises }, now)
}

/** 移除某個動作；範本只剩一個動作（範本至少要有 1 個動作）或找不到該動作時範本不變 */
export function removeTemplateExercise(
  template: WorkoutTemplate,
  templateExerciseId: string,
  now: Timestamp,
): WorkoutTemplate {
  if (template.exercises.length <= 1) return template
  if (!template.exercises.some((item) => item.id === templateExerciseId)) return template
  return updateTemplate(
    template,
    { exercises: template.exercises.filter((item) => item.id !== templateExerciseId) },
    now,
  )
}

/** 把動作加到範本最後面，預設 3 組 */
export function addTemplateExercise(
  template: WorkoutTemplate,
  exerciseId: string,
  { now, createId }: EditContext,
): WorkoutTemplate {
  return updateTemplate(
    template,
    {
      exercises: [
        ...template.exercises,
        { id: createId(), exerciseId, setCount: DEFAULT_TEMPLATE_SETS },
      ],
    },
    now,
  )
}

/**
 * 刪除自訂動作時，把範本裡的這個動作（可能不只一個）一併移除。
 * 沒有用到該動作時範本不變；沒有任何動作剩下時回傳 undefined，代表整個範本刪除。
 */
export function removeExerciseFromTemplate(
  template: WorkoutTemplate,
  exerciseId: string,
  now: Timestamp,
): WorkoutTemplate | undefined {
  if (!template.exercises.some((item) => item.exerciseId === exerciseId)) return template
  const exercises = template.exercises.filter((item) => item.exerciseId !== exerciseId)
  return exercises.length > 0 ? updateTemplate(template, { exercises }, now) : undefined
}
