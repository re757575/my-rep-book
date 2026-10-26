import { Dexie } from 'dexie'
import { db, DB_NAME } from '@/data/dexie/db'

/**
 * 以 IndexedDB schema v1（還沒有體重資料表）建立資料庫並寫入資料，
 * 模擬舊版 App 留下的資料庫；之後 `renderApp()` 開啟時會升級到目前的版本。
 * 每一列照 v1 時存的樣子傳入（例如 workouts 要帶衍生欄位 exerciseIds）。
 */
export async function seedV1Database(rows: { workouts?: object[]; settings?: object }) {
  db.close({ disableAutoOpen: false })
  const v1 = new Dexie(DB_NAME)
  v1.version(1).stores({
    workouts: 'date, *exerciseIds',
    customExercises: 'id, nameKey',
    hiddenPresets: 'id',
    settings: 'key',
  })
  await v1.table('workouts').bulkPut(rows.workouts ?? [])
  if (rows.settings) await v1.table('settings').put({ key: 'settings', ...rows.settings })
  v1.close()
}
