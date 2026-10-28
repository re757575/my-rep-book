import type { WorkoutTemplate } from '@/domain'
import type { TemplateRepository } from '../repositories'
import type { MyRepBookDb } from './db'

/** 依建立時間由舊到新；建立時間相同時依 ID，順序才固定 */
export function sortTemplates(templates: WorkoutTemplate[]): WorkoutTemplate[] {
  return templates.sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )
}

export function createDexieTemplateRepository(db: MyRepBookDb): TemplateRepository {
  return {
    async listAll() {
      return sortTemplates(await db.templates.toArray())
    },

    getById(id) {
      return db.templates.get(id)
    },

    async save(template) {
      await db.transaction('rw', db.templates, () => db.templates.put(template))
    },

    async update(id, change) {
      await db.transaction('rw', db.templates, async () => {
        const current = await db.templates.get(id)
        if (current) await db.templates.put(change(current))
      })
    },

    async delete(id) {
      await db.transaction('rw', db.templates, () => db.templates.delete(id))
    },
  }
}
