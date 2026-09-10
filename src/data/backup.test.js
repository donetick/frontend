import { beforeEach, describe, expect, it } from 'vitest'

import {
  BACKUP_FORMAT,
  backupFilename,
  exportBackup,
  importBackup,
} from './backup'
import { choreRepo } from './repositories/choreRepo'
import { historyRepo } from './repositories/historyRepo'
import { labelRepo } from './repositories/labelRepo'
import { COLLECTIONS, SCHEMA_VERSION, store } from './store'

const seed = async () => {
  const label = await labelRepo.create({ name: 'Kitchen' })
  const chore = await choreRepo.save({
    name: 'Dishes',
    frequencyType: 'daily',
    frequency: 1,
    frequencyMetadata: { time: '2025-01-01T09:00:00Z' },
    nextDueDate: '2025-03-10T09:00:00Z',
    labelsV2: [label],
  })
  await choreRepo.complete(chore.id, { completedDate: '2025-03-10T09:30:00Z' })
  return { chore, label }
}

beforeEach(async () => {
  await store.init()
  await store.clear()
})

describe('exportBackup', () => {
  it('captures every collection with its stored ids', async () => {
    const { chore, label } = await seed()
    const payload = await exportBackup()

    expect(payload.format).toBe(BACKUP_FORMAT)
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION)
    expect(payload.collections[COLLECTIONS.CHORE][0]._id).toBe(chore.id)
    expect(payload.collections[COLLECTIONS.LABEL][0]._id).toBe(label.id)
    expect(payload.collections[COLLECTIONS.HISTORY]).toHaveLength(1)
  })

  it('includes tombstones so deletes survive a restore', async () => {
    const { chore } = await seed()
    await choreRepo.remove(chore.id)

    const payload = await exportBackup()
    const chores = payload.collections[COLLECTIONS.CHORE]

    expect(chores).toHaveLength(1)
    expect(chores[0]._deletedAt).toBeTruthy()
  })

  it('names the file by date', () => {
    expect(backupFilename(new Date('2025-06-01T12:00:00Z'))).toBe(
      'donetick-backup-2025-06-01.json',
    )
  })
})

describe('importBackup', () => {
  it('round-trips through JSON with relations intact', async () => {
    const { chore, label } = await seed()
    const json = JSON.stringify(await exportBackup())

    await store.clear()
    expect(await choreRepo.all()).toHaveLength(0)

    const { restored } = await importBackup(json)

    expect(restored[COLLECTIONS.CHORE]).toBe(1)
    const restoredChore = await choreRepo.get(chore.id)
    expect(restoredChore.name).toBe('Dishes')
    expect(restoredChore.labelsV2[0].id).toBe(label.id)
    expect(await historyRepo.forChore(chore.id)).toHaveLength(1)
  })

  it('replaces existing data by default', async () => {
    const json = JSON.stringify(await exportBackup())
    await choreRepo.save({ name: 'Should not survive', frequencyType: 'once' })

    await importBackup(json)

    expect(await choreRepo.all()).toHaveLength(0)
  })

  it('keeps existing data in merge mode', async () => {
    const json = JSON.stringify(await exportBackup())
    await choreRepo.save({ name: 'Kept', frequencyType: 'once' })

    await importBackup(json, { mode: 'merge' })

    expect((await choreRepo.all()).map(chore => chore.name)).toEqual(['Kept'])
  })

  it('rejects a file that is not a Donetick backup', async () => {
    await expect(importBackup('{"hello":"world"}')).rejects.toThrow(
      'not a Donetick backup',
    )
  })

  it('rejects a backup from a newer schema', async () => {
    const payload = await exportBackup()
    payload.schemaVersion = SCHEMA_VERSION + 1

    await expect(importBackup(payload)).rejects.toThrow(
      'newer version of Donetick',
    )
  })
})
