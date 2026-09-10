/**
 * JSON export / import of the whole local database.
 *
 * In local-only mode this is the user's only backup, so it ships alongside
 * local mode rather than later. The format is deliberately plain and
 * self-describing: a version, a timestamp, and one array per collection of the
 * raw stored documents including their bookkeeping fields, so an import can
 * restore ids, tombstones and dirty flags exactly.
 */

import { COLLECTIONS, SCHEMA_VERSION, store } from './store'

export const BACKUP_FORMAT = 'donetick-local-backup'

/** Build the backup payload. Tombstones are included so deletes survive. */
export const exportBackup = async () => {
  await store.init()

  const collections = {}
  for (const name of Object.values(COLLECTIONS)) {
    collections[name] = await store.all(name, { includeDeleted: true })
  }

  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: import.meta.env?.VITE_APP_VERSION ?? null,
    collections,
  }
}

/** Backup as a pretty-printed JSON string, ready to write to a file. */
export const exportBackupJSON = async () =>
  JSON.stringify(await exportBackup(), null, 2)

/** A stable, sortable filename for the download. */
export const backupFilename = (date = new Date()) =>
  `donetick-backup-${date.toISOString().slice(0, 10)}.json`

const assertValidPayload = payload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('That file is not a Donetick backup')
  }
  if (payload.format !== BACKUP_FORMAT) {
    throw new Error('That file is not a Donetick backup')
  }
  if (!payload.collections || typeof payload.collections !== 'object') {
    throw new Error('The backup is missing its data')
  }
  if (payload.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'That backup was made by a newer version of Donetick. Update the app and try again.',
    )
  }
}

/**
 * Restore a backup.
 *
 * @param {object|string} input the payload or its JSON text
 * @param {object} [options]
 * @param {'replace'|'merge'} [options.mode='replace']
 *   'replace' wipes the local database first — the right default for restoring
 *   onto a fresh device. 'merge' keeps existing documents and overwrites only
 *   the ids present in the backup.
 * @returns {{restored: object, mode: string}} per-collection counts
 */
export const importBackup = async (input, { mode = 'replace' } = {}) => {
  const payload = typeof input === 'string' ? JSON.parse(input) : input
  assertValidPayload(payload)

  await store.init()
  if (mode === 'replace') await store.clear()

  const restored = {}
  for (const [collection, docs] of Object.entries(payload.collections)) {
    if (!Array.isArray(docs) || docs.length === 0) {
      restored[collection] = 0
      continue
    }

    // Documents keep their original ids, so relations between chores, labels
    // and history survive the round trip untouched.
    await store.putMany(collection, docs, { dirty: true })
    restored[collection] = docs.length
  }

  // The cache was populated from the pre-import state on a merge.
  store.invalidate()

  return { restored, mode }
}

/**
 * Trigger a browser download of the backup. Native platforms should share the
 * string from `exportBackupJSON` instead.
 */
export const downloadBackup = async () => {
  const json = await exportBackupJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = backupFilename()
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return json.length
}
