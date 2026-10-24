import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, use, type DependencyList } from 'react'
import { createDexieRepositories, db } from './dexie'
import type { Repositories } from './repositories'

const RepositoriesContext = createContext<Repositories>(createDexieRepositories(db))

/** 預設使用 Dexie 實作；需要替換實作時在 App 外層包一層 Provider */
export const RepositoriesProvider = RepositoriesContext.Provider

export function useRepositories(): Repositories {
  return use(RepositoriesContext)
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
