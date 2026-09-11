import { beforeEach, describe, expect, it, vi } from 'vitest'

import { labelRepo } from '../data/repositories/labelRepo'
import { projectRepo } from '../data/repositories/projectRepo'
import { COLLECTIONS, store } from '../data/store'
import { GetLabels, GetProjects } from '../utils/Fetcher'
import { previewAdoption } from './adoptionPreview'

vi.mock('../utils/Fetcher', () => ({
  GetLabels: vi.fn(),
  GetProjects: vi.fn(),
}))

beforeEach(async () => {
  await store.init()
  await store.clear()
  GetLabels.mockResolvedValue({ res: [] })
  GetProjects.mockResolvedValue({ res: [] })
})

describe('previewAdoption', () => {
  it('reports no local data when the store is empty', async () => {
    const preview = await previewAdoption()
    expect(preview.hasLocalData).toBe(false)
  })

  it('counts unsynced local documents per collection', async () => {
    await labelRepo.create({ name: 'Home' })
    await projectRepo.create({ name: 'Renovation' })
    await store.put(COLLECTIONS.CHORE, { name: 'Paint fence' })

    const preview = await previewAdoption()

    expect(preview.hasLocalData).toBe(true)
    expect(preview.chores.total).toBe(1)
    expect(preview.labels.total).toBe(1)
    expect(preview.projects.total).toBe(1)
  })

  it('matches a local label to an existing account label by name, case/whitespace-insensitive', async () => {
    const label = await labelRepo.create({ name: '  Groceries ' })
    GetLabels.mockResolvedValue({ res: [{ id: 42, name: 'groceries' }] })

    const preview = await previewAdoption()

    expect(preview.labels.matched).toBe(1)
    expect(preview.labels.new).toBe(0)
    expect(preview.labels.matchMap.get(label.id)).toBe(42)
    expect(preview.accountHasExistingData).toBe(true)
  })

  it('does not match labels with different names', async () => {
    await labelRepo.create({ name: 'Work' })
    GetLabels.mockResolvedValue({ res: [{ id: 42, name: 'Home' }] })

    const preview = await previewAdoption()

    expect(preview.labels.matched).toBe(0)
    expect(preview.labels.new).toBe(1)
  })

  it('does not skip already-synced documents when counting', async () => {
    const label = await labelRepo.create({ name: 'Synced already' })
    await store.markSynced(COLLECTIONS.LABEL, label.id, 999)

    const preview = await previewAdoption()

    expect(preview.labels.total).toBe(0)
    expect(preview.hasLocalData).toBe(false)
  })

  it('treats a null `res` (account has none of this collection yet) as no existing rows', async () => {
    await labelRepo.create({ name: 'Home' })
    GetLabels.mockResolvedValue({ res: null })

    const preview = await previewAdoption()

    expect(preview.labels.matched).toBe(0)
    expect(preview.labels.new).toBe(1)
    expect(preview.labels.existingCount).toBe(0)
  })

  it('falls back to no matches if fetching existing labels fails', async () => {
    await labelRepo.create({ name: 'Home' })
    GetLabels.mockRejectedValue(new Error('network error'))

    const preview = await previewAdoption()

    expect(preview.labels.matched).toBe(0)
    expect(preview.labels.new).toBe(1)
  })
})
