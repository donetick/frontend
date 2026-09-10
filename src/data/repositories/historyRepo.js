/**
 * Chore history repository.
 *
 * History is its own collection keyed by the chore's local id, which keeps the
 * chore document small and lets the activity views read across every chore in
 * one pass.
 */

import { HISTORY_STATUS } from '../../domain/completion'
import { COLLECTIONS, newLocalId, store } from '../store'

const present = doc => (doc ? { ...doc, id: doc._id } : null)

const byPerformedAtDesc = (a, b) =>
  new Date(b.performedAt ?? 0).getTime() -
  new Date(a.performedAt ?? 0).getTime()

export const historyRepo = {
  /** Every history entry, newest first. */
  async all() {
    const docs = await store.all(COLLECTIONS.HISTORY)
    return docs.map(present).sort(byPerformedAtDesc)
  },

  /** History for one chore, newest first. */
  async forChore(choreId) {
    const key = String(choreId)
    const docs = await store.all(COLLECTIONS.HISTORY)
    return docs
      .filter(doc => String(doc.choreId) === key)
      .map(present)
      .sort(byPerformedAtDesc)
  },

  /** Entries performed within the last `days` days, newest first. */
  async recent(days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const docs = await store.all(COLLECTIONS.HISTORY)
    return docs
      .filter(doc => new Date(doc.performedAt ?? 0).getTime() >= cutoff)
      .map(present)
      .sort(byPerformedAtDesc)
  },

  /** The open "started" entry for a chore, if its timer is running. */
  async startedEntry(choreId) {
    const entries = await this.forChore(choreId)
    return (
      entries.find(entry => entry.status === HISTORY_STATUS.STARTED) ?? null
    )
  },

  /**
   * Write a history entry. The domain layer hands back either a fresh entry or
   * a reused "started" one; reusing means updating in place, which is how the
   * elapsed time survives the completion.
   */
  async record(choreId, entry) {
    const key = String(choreId)
    const existing = entry?.id
      ? await store.get(COLLECTIONS.HISTORY, String(entry.id))
      : null
    const id = existing?._id ?? newLocalId()

    const doc = {
      ...(existing ?? {}),
      ...entry,
      id,
      _id: id,
      choreId: key,
      createdAt:
        existing?.createdAt ?? entry?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return present(await store.put(COLLECTIONS.HISTORY, doc))
  },

  async update(historyId, updates) {
    const key = String(historyId)
    const existing = await store.get(COLLECTIONS.HISTORY, key)
    if (!existing) return null
    return present(
      await store.put(COLLECTIONS.HISTORY, {
        ...existing,
        ...updates,
        _id: key,
        id: key,
        updatedAt: new Date().toISOString(),
      }),
    )
  },

  async remove(historyId) {
    await store.remove(COLLECTIONS.HISTORY, String(historyId))
    return { id: String(historyId) }
  },

  /** Tombstone every entry for a chore — used when the chore itself is deleted. */
  async removeForChore(choreId) {
    const entries = await this.forChore(choreId)
    for (const entry of entries) {
      await store.remove(COLLECTIONS.HISTORY, entry.id)
    }
    return entries.length
  },
}

export default historyRepo
