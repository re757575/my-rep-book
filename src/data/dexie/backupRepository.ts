import type { BackupRepository } from '../repositories'
import type { MyRepBookDb } from './db'
import { notImplemented } from './notImplemented'

export function createDexieBackupRepository(_db: MyRepBookDb): BackupRepository {
  return {
    exportAll: notImplemented('BackupRepository.exportAll'),
    replaceAll: notImplemented('BackupRepository.replaceAll'),
  }
}
