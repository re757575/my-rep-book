import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, use, useEffect, type DependencyList } from 'react'
import { createDexieRepositories, db } from './dexie'
import type { Repositories } from './repositories'

const RepositoriesContext = createContext<Repositories>(createDexieRepositories(db))

/** 預設使用 Dexie 實作；需要替換實作時在 App 外層包一層 Provider */
export const RepositoriesProvider = RepositoriesContext.Provider

export function useRepositories(): Repositories {
  return use(RepositoriesContext)
}

/**
 * 頁面切到背景（`visibilitychange` 變成 hidden）或即將卸載（`pagehide`）時，
 * 立即寫入還沒寫入的欄位編輯。在 App 根元件呼叫一次。
 */
export function useFlushFieldEditsOnHide() {
  const { workouts } = useRepositories()
  useEffect(() => {
    function flush() {
      workouts.flushFieldEdits().catch((error: unknown) => {
        console.error('寫入欄位編輯失敗，留待之後補寫', error)
      })
    }
    function flushIfHidden() {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', flushIfHidden)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flushIfHidden)
      window.removeEventListener('pagehide', flush)
    }
  }, [workouts])
}

/**
 * 讀取持久資料並在資料變動時自動更新（包含其他分頁的寫入）。
 * 載入中回傳 undefined；要表達「找不到」請讓 query 回傳 null。
 *
 * @example
 * const exercises = useLiveData((repos) => repos.exercises.listAll(), [])
 */
export function useLiveData<T>(
  query: (repositories: Repositories) => Promise<T>,
  deps: DependencyList,
): T | undefined {
  const repositories = useRepositories()
  return useLiveQuery(() => query(repositories), [repositories, ...deps])
}
