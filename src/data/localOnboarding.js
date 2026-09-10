/**
 * Entering local-only mode.
 *
 * One call does everything the "Use without an account" path needs: flip the
 * mode, open the store, and give a brand-new user something to look at instead
 * of an empty screen.
 */

import { enterLocalMode } from './appMode'
import { ensureLocalStoreReady, requestPersistentStorage } from './health'
import { choreRepo } from './repositories/choreRepo'
import { labelRepo } from './repositories/labelRepo'
import { COLLECTIONS, store } from './store'

const SEEDED_KEY = 'seededAt'

const atHourToday = (hour, dayOffset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

/**
 * A small starter set. Deliberately tiny and obviously editable — enough to
 * show what a chore, a recurrence and a label look like, not enough to feel
 * like someone else's task list.
 */
const seedStarterData = async () => {
  const home = await labelRepo.create({ name: 'Home', color: '#4caf50' })
  const personal = await labelRepo.create({
    name: 'Personal',
    color: '#7d92c4',
  })

  await choreRepo.save({
    name: 'Take out the bins',
    frequencyType: 'days_of_the_week',
    frequency: 1,
    frequencyMetadata: {
      days: ['sunday'],
      time: atHourToday(19),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    nextDueDate: atHourToday(19, (7 - new Date().getDay()) % 7 || 7),
    labelsV2: [home],
    priority: 0,
  })

  await choreRepo.save({
    name: 'Try completing this task',
    description:
      'Tap the circle to complete it. Recurring tasks reschedule themselves.',
    frequencyType: 'daily',
    frequency: 1,
    frequencyMetadata: { time: atHourToday(9) },
    nextDueDate: atHourToday(9),
    labelsV2: [personal],
    priority: 0,
  })
}

/** True when this device has never held any local data. */
export const isFirstRunLocal = async () => {
  await store.init()
  const chores = await store.all(COLLECTIONS.CHORE, { includeDeleted: true })
  const labels = await store.all(COLLECTIONS.LABEL, { includeDeleted: true })
  return chores.length === 0 && labels.length === 0
}

/**
 * Switch the app into local-only mode.
 *
 * @param {object} [options]
 * @param {boolean} [options.seed=true] seed the starter set on a fresh device
 */
export const startLocalMode = async ({ seed = true } = {}) => {
  await ensureLocalStoreReady()

  // The database is now the only copy of this user's data, so ask for storage
  // the browser has promised not to evict. Best-effort: a refusal is fine, the
  // backup screen is the real safety net.
  requestPersistentStorage()

  // Seeding is keyed off a meta flag as well as emptiness, so a user who
  // deletes every seeded task never gets them back on the next launch.
  const alreadySeeded = await store.getMeta(SEEDED_KEY)
  if (seed && !alreadySeeded && (await isFirstRunLocal())) {
    await seedStarterData()
    await store.setMeta(SEEDED_KEY, new Date().toISOString())
  }

  enterLocalMode()
}
