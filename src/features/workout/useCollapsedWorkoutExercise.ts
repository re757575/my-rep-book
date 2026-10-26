import { useState } from 'react'

const STORAGE_KEY = 'my-rep-book:collapsed-workout-exercises'
/** 只記住最近收合的幾個訓練動作，避免清單無限增長 */
const MAX_REMEMBERED = 100

function readCollapsedIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeCollapsedIds(ids: readonly string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_REMEMBERED)))
  } catch {
    // localStorage 無法使用時只在這次瀏覽期間記住
  }
}

/**
 * 訓練動作是否收合。收合狀態是畫面狀態，不是訓練資料：存在 localStorage，
 * 重新整理或換頁回來仍然收合，但不寫進資料庫，也不包含在備份檔中。
 */
export function useCollapsedWorkoutExercise(
  workoutExerciseId: string,
): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => readCollapsedIds().includes(workoutExerciseId))

  function update(next: boolean) {
    setCollapsed(next)
    const others = readCollapsedIds().filter((id) => id !== workoutExerciseId)
    writeCollapsedIds(next ? [...others, workoutExerciseId] : others)
  }

  return [collapsed, update]
}
