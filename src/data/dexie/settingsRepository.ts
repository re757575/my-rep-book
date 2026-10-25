import { DEFAULT_SETTINGS, type Settings } from '@/domain'
import type { SettingsRepository } from '../repositories'
import type { MyRepBookDb, SettingsRow } from './db'

const SETTINGS_KEY = 'settings'

function toSettings(row: SettingsRow | undefined): Settings {
  if (!row) return { ...DEFAULT_SETTINGS }
  const { key: _key, ...settings } = row
  return settings
}

export function createDexieSettingsRepository(db: MyRepBookDb): SettingsRepository {
  return {
    async get() {
      return toSettings(await db.settings.get(SETTINGS_KEY))
    },

    async update(patch) {
      await db.transaction('rw', db.settings, async () => {
        const current = toSettings(await db.settings.get(SETTINGS_KEY))
        await db.settings.put({ ...current, ...patch, key: SETTINGS_KEY })
      })
    },
  }
}
