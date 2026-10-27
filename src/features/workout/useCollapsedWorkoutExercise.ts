import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'my-rep-book:collapsed-workout-exercises'
/** 只記住最近收合的幾個訓練動作，避免清單無限增長 */
const MAX_REMEMBERED = 100

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parseIds(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

// 同樣的儲存內容回傳同一個陣列，`useSyncExternalStore` 才不會一直重新渲染
let cached: { raw: string | null; ids: string[] } | undefined
function readCollapsedIds(): string[] {
  const raw = readRaw()
  if (!cached || cached.raw !== raw) cached = { raw, ids: parseIds(raw) }
  return cached.ids
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function writeCollapsedIds(ids: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_REMEMBERED)))
  } catch {
    // localStorage 無法使用時，這次瀏覽期間不會記住
  }
  listeners.forEach((listener) => listener())
}

/**
 * 訓練動作是否收合。收合狀態是畫面狀態，不是訓練資料：存在 localStorage，
 * 重新整理或換頁回來仍然收合，但不寫進資料庫，也不包含在備份檔中。
 * 狀態放在模組外（`useSyncExternalStore`），所以「全部收合」與每個動作讀的是同一份。
 */
export function useCollapsedWorkoutExercise(
  workoutExerciseId: string,
): [boolean, (collapsed: boolean) => void] {
  const ids = useSyncExternalStore(subscribe, readCollapsedIds)

  function update(next: boolean) {
    const others = readCollapsedIds().filter((id) => id !== workoutExerciseId)
    writeCollapsedIds(next ? [...others, workoutExerciseId] : others)
  }

  return [ids.includes(workoutExerciseId), update]
}

/**
 * 這幾個訓練動作是不是全部都已收合（`workoutExerciseIds` 為空時是 false），
 * 以及一次收合或展開它們（US-35）。
 */
export function useCollapseAll(
  workoutExerciseIds: readonly string[],
): [allCollapsed: boolean, setAll: (collapsed: boolean) => void] {
  const ids = useSyncExternalStore(subscribe, readCollapsedIds)
  const allCollapsed =
    workoutExerciseIds.length > 0 && workoutExerciseIds.every((id) => ids.includes(id))

  function setAll(collapsed: boolean) {
    const others = readCollapsedIds().filter((id) => !workoutExerciseIds.includes(id))
    writeCollapsedIds(collapsed ? [...others, ...workoutExerciseIds] : others)
  }

  return [allCollapsed, setAll]
}
