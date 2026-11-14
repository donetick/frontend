import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { mergePendingCreates } from '../utils/PendingChores'

// Backdate restored data so requests revalidate it in the background.
const HYDRATED_UPDATED_AT = 1
const isMissing = value => value === null || typeof value === 'undefined'
const asList = value => (Array.isArray(value) ? value : undefined)

export const hydrateQueriesFromOfflineCache = async (
  queryClient,
  { criticalOnly = false } = {},
) => {
  if (!isOfflineFeatureEnabled()) return
  const token = localStorage.getItem('token')
  if (!token) return

  // Never restore the previous session after logout or an account switch.
  const seed = (queryKey, data) => {
    if (localStorage.getItem('token') !== token || isMissing(data)) return
    if (!isMissing(queryClient.getQueryState(queryKey)?.data)) return
    queryClient.setQueryData(queryKey, data, { updatedAt: HYDRATED_UPDATED_AT })
  }
  const restore = async operation => {
    try {
      await operation()
    } catch (err) {
      // One unreadable resource must not prevent the others from rendering.
      console.error('Failed to hydrate query from offline cache', err)
    }
  }

  try {
    await offlineDB.init()
    // Start optional reads independently. Startup only waits for the profile
    // and task snapshot; a project/section read must never hold the app shell.
    const optional = Promise.all([
      ...['labels', 'filters'].map(key =>
        restore(async () => seed([key], asList(await offlineDB.getKV(key)))),
      ),
      restore(async () => {
        const members = asList(await offlineDB.getKV('circle_members'))
        if (members) seed(['allCircleMembers'], { res: members })
      }),
      restore(async () => {
        const projects = asList(await offlineDB.getKV('projects'))
        seed(['projects'], projects)
        // Columns are independent of the home/task-list critical path.
        await Promise.all(
          (projects || []).map(project =>
            restore(async () => {
              const sections = await offlineDB.getKV(
                `project_sections:${project.id}`,
              )
              seed(['projectSections', project.id], asList(sections))
            }),
          ),
        )
      }),
    ])
    const critical = Promise.all([
      restore(async () => {
        seed(['userProfile', token], await offlineDB.getKV('user_profile'))
      }),
      restore(async () => {
        const cached = asList(await offlineDB.getChores(true))
        if (!cached) return
        const chores = await mergePendingCreates(cached)
        // Empty storage is not proof of an empty account. Only a completed
        // sync or successful list fetch establishes a valid empty snapshot.
        const synced = chores.length > 0 || (await offlineDB.getLastSyncTime())
        const complete =
          synced || (await offlineDB.getKV('chores_snapshot:true'))
        const active =
          complete || (await offlineDB.getKV('chores_snapshot:false'))
        if (chores.length > 0 || complete) {
          seed(['chores', true], { res: chores })
        }
        if (chores.length > 0 || active) {
          seed(['chores', false], {
            res: chores.filter(chore => chore.isActive !== false),
          })
        }
      }),
    ])
    await critical
    if (!criticalOnly) await optional
  } catch (err) {
    console.error('Failed to open offline cache', err)
  }
}
