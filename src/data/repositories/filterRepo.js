/**
 * Filter repository.
 *
 * Saved filters are self-contained (name, conditions, pin state, usage
 * stats) — nothing else references them, so unlike labels/projects there is
 * no propagation step on update or delete.
 */

import { COLLECTIONS, newLocalId, store } from '../store'

const present = doc => (doc ? { ...doc, id: doc._id } : null)

const byRecency = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

export const filterRepo = {
  async all() {
    const docs = await store.all(COLLECTIONS.FILTER)
    return docs.map(present).sort(byRecency)
  },

  async pinned() {
    const all = await this.all()
    return all.filter(filter => filter.isPinned)
  },

  async byUsage() {
    const all = await this.all()
    return [...all].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
  },

  async get(id) {
    return present(await store.get(COLLECTIONS.FILTER, String(id)))
  },

  async create(filter) {
    const id = newLocalId()
    return present(
      await store.put(COLLECTIONS.FILTER, {
        conditions: [],
        isPinned: false,
        usageCount: 0,
        lastUsedAt: null,
        ...filter,
        id,
        _id: id,
        createdAt: new Date().toISOString(),
      }),
    )
  },

  async update(id, filter) {
    const key = String(id)
    const existing = await store.get(COLLECTIONS.FILTER, key)
    if (!existing) return null
    return present(
      await store.put(COLLECTIONS.FILTER, {
        ...existing,
        ...filter,
        _id: key,
        id: key,
      }),
    )
  },

  async remove(id) {
    const key = String(id)
    await store.remove(COLLECTIONS.FILTER, key)
    return { id: key, deleted: true }
  },

  async togglePin(id) {
    const key = String(id)
    const existing = await store.get(COLLECTIONS.FILTER, key)
    if (!existing) return null
    return present(
      await store.put(COLLECTIONS.FILTER, {
        ...existing,
        isPinned: !existing.isPinned,
        _id: key,
        id: key,
      }),
    )
  },

  async trackUsage(id) {
    const key = String(id)
    const existing = await store.get(COLLECTIONS.FILTER, key)
    if (!existing) return null
    return present(
      await store.put(COLLECTIONS.FILTER, {
        ...existing,
        usageCount: (existing.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
        _id: key,
        id: key,
      }),
    )
  },
}

export default filterRepo
