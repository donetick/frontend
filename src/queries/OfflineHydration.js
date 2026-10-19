import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { mergePendingCreates } from '../utils/PendingChores'

// Seeds React Query with whatever the offline store already holds, so the
// first paint comes from cache instead of from the network.
//
// Without this, a cold start against an unreachable server shows a spinner for
// as long as fetch() takes to fail — up to the ApiClient timeout — because the
// screens gate their render on `isLoading` and every queryFn only reaches its
// cache fallback inside a catch block. An unreachable host (Wi-Fi dropped, LAN
// IP no longer routable) fails slowly: the request hangs until it times out,
// unlike a server that is up but refusing, which fails instantly.
//
// Seeded entries are backdated so React Query treats them as stale and still
// refetches in the background, replacing them the moment the server answers.
// Seeding mid-flight is safe: setQueryData marks the write `manual`, which
// leaves an in-flight fetch running (and its result wins) while flipping the
// query out of its loading state.
const HYDRATED_UPDATED_AT = 1

const isMissing = value => value === null || typeof value === 'undefined'

// A corrupted or half-written cache entry must not reach a screen that expects
// a list, so anything that isn't an array is treated as absent.
const asList = value => (Array.isArray(value) ? value : undefined)

// Never overwrite a query that already has data: by the time the IDB read
// finishes, a fast network may have resolved the real request already.
const seed = (queryClient, queryKey, data) => {
  if (isMissing(data)) return
  if (!isMissing(queryClient.getQueryState(queryKey)?.data)) return
  queryClient.setQueryData(queryKey, data, { updatedAt: HYDRATED_UPDATED_AT })
}

export const hydrateQueriesFromOfflineCache = async queryClient => {
  if (!isOfflineFeatureEnabled()) return
  // No session means nothing of the user's to restore (login, invite links).
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    await offlineDB.init()

    // These KV keys are written by the queries being seeded — UserQueries,
    // LabelQueries, ProjectQueries and FilterQueries — so the two sides have
    // to stay in step. Hydration is silent when it finds nothing, and a
    // renamed key would quietly cost that screen its offline first paint.
    const [profile, labels, projects, circleMembers, filters, chores] =
      await Promise.all([
        offlineDB.getKV('user_profile'),
        offlineDB.getKV('labels'),
        offlineDB.getKV('projects'),
        offlineDB.getKV('circle_members'),
        offlineDB.getKV('filters'),
        // Both backends scan the whole store regardless of this flag. Read the
        // complete list once, then derive the active list in memory so direct
        // launches into the archive screen are hydrated without a second scan.
        offlineDB.getChores(true),
      ])

    seed(queryClient, ['userProfile', token], profile)
    seed(queryClient, ['labels'], asList(labels))
    seed(queryClient, ['projects'], asList(projects))
    seed(queryClient, ['filters'], asList(filters))
    const members = asList(circleMembers)
    if (members) seed(queryClient, ['allCircleMembers'], { res: members })

    const cachedChores = asList(chores)
    if (cachedChores) {
      // An empty array is still valid cached data and must be seeded; otherwise
      // users with no chores remain on the network spinner until it times out.
      // mergePendingCreates may also turn an empty cache into a visible list.
      const allChores = await mergePendingCreates(cachedChores)
      seed(queryClient, ['chores', true], { res: allChores })
      seed(queryClient, ['chores', false], {
        res: allChores.filter(chore => chore.isActive !== false),
      })
    }
  } catch (err) {
    // Hydration is an optimization — a failure here just means the normal
    // network path (and its own cache fallbacks) takes over.
    console.error('Failed to hydrate queries from offline cache', err)
  }
}
