import type { SettingsRepository } from '../repositories'
import type { MyRepBookDb } from './db'
import { notImplemented } from './notImplemented'

export function createDexieSettingsRepository(_db: MyRepBookDb): SettingsRepository {
  return {
    get: notImplemented('SettingsRepository.get'),
    update: notImplemented('SettingsRepository.update'),
  }
}
