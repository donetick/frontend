/**
 * Project repository.
 *
 * Chores reference a project by id (`projectId`) rather than embedding it, so
 * deleting a project just clears the reference on its chores; the chores
 * themselves survive.
 */

import { COLLECTIONS, newLocalId, store } from '../store'

const present = doc => (doc ? { ...doc, id: doc._id } : null)

const DEFAULT_COLOR = '#1976d2'

export const projectRepo = {
  async all() {
    const docs = await store.all(COLLECTIONS.PROJECT)
    return docs.map(present).sort((a, b) => a.name.localeCompare(b.name))
  },

  async get(id) {
    return present(await store.get(COLLECTIONS.PROJECT, String(id)))
  },

  async create(project) {
    const id = newLocalId()
    return present(
      await store.put(COLLECTIONS.PROJECT, {
        color: DEFAULT_COLOR,
        description: null,
        ...project,
        id,
        _id: id,
        createdAt: new Date().toISOString(),
      }),
    )
  },

  async update(id, project) {
    const key = String(id)
    const existing = await store.get(COLLECTIONS.PROJECT, key)
    if (!existing) return null
    return present(
      await store.put(COLLECTIONS.PROJECT, {
        ...existing,
        ...project,
        _id: key,
        id: key,
        updatedAt: new Date().toISOString(),
      }),
    )
  },

  async remove(id) {
    const key = String(id)

    // Orphan the chores rather than deleting them — losing tasks because a
    // container was removed is never what the user meant.
    const chores = await store.all(COLLECTIONS.CHORE)
    const affected = chores.filter(chore => String(chore.projectId) === key)
    if (affected.length) {
      await store.putMany(
        COLLECTIONS.CHORE,
        affected.map(chore => ({ ...chore, projectId: null })),
      )
    }

    await store.remove(COLLECTIONS.PROJECT, key)
    return { id: key, deleted: true, orphanedChores: affected.length }
  },
}

export default projectRepo
