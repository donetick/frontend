/**
 * Label repository.
 *
 * Chores carry a denormalised `labelsV2` array, exactly as the API returns
 * them, so every existing filter and card keeps working. That means renames and
 * deletes have to be propagated into the chores that embed the label — which is
 * what `update` and `remove` do here.
 */

import { COLLECTIONS, newLocalId, store } from '../store'

const present = doc => (doc ? { ...doc, id: doc._id } : null)

const DEFAULT_COLOR = '#7d92c4'

/** Rewrite every chore's embedded copy of a label. */
const propagateToChores = async (labelId, transform) => {
  const key = String(labelId)
  const chores = await store.all(COLLECTIONS.CHORE)
  const affected = chores.filter(chore =>
    (chore.labelsV2 || []).some(label => String(label.id) === key),
  )
  if (!affected.length) return

  await store.putMany(
    COLLECTIONS.CHORE,
    affected.map(chore => ({
      ...chore,
      labelsV2: transform(chore.labelsV2 || []),
    })),
  )
}

export const labelRepo = {
  async all() {
    const docs = await store.all(COLLECTIONS.LABEL)
    return docs.map(present).sort((a, b) => a.name.localeCompare(b.name))
  },

  async get(id) {
    return present(await store.get(COLLECTIONS.LABEL, String(id)))
  },

  async create(label) {
    const id = newLocalId()
    return present(
      await store.put(COLLECTIONS.LABEL, {
        color: DEFAULT_COLOR,
        ...label,
        id,
        _id: id,
        createdAt: new Date().toISOString(),
      }),
    )
  },

  async update(label) {
    const key = String(label.id)
    const existing = await store.get(COLLECTIONS.LABEL, key)
    if (!existing) return null

    const saved = await store.put(COLLECTIONS.LABEL, {
      ...existing,
      ...label,
      _id: key,
      id: key,
    })

    const updated = present(saved)
    await propagateToChores(key, labels =>
      labels.map(candidate =>
        String(candidate.id) === key ? { ...candidate, ...updated } : candidate,
      ),
    )

    return updated
  },

  async remove(id) {
    const key = String(id)
    await propagateToChores(key, labels =>
      labels.filter(label => String(label.id) !== key),
    )
    await store.remove(COLLECTIONS.LABEL, key)
    return { id: key }
  },
}

export default labelRepo
