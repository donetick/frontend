/**
 * Wraps `MarkChoreComplete`/`DeleteChore`/`SkipChore`/`SaveChore` for callers
 * that bypass `ChoreQueries.jsx` and call `Fetcher` directly — `useChoreActions.js`,
 * `ChoreView.jsx`, `ArchivedTasks.jsx` (see
 * `docs/offline-first-phase4-step3-plan.md` §3.7).
 *
 * These four stay `isLocalMode()`-only inside `Fetcher.jsx` on purpose:
 * `accountSync.push()` (`src/sync/accountSync.js`) imports the same
 * functions to replay local writes against the real server, and widening
 * them there would make push() write back into the local store instead of
 * the server. These wrappers route directly to the repo when
 * `shouldUseLocalFirstStore()` is true, mirroring what the matching Fetcher
 * branch already does for local-only mode.
 */
import { shouldUseLocalFirstStore } from '../data/accountLocalFirst'
import { localResponse } from '../data/localResponse'
import { choreRepo } from '../data/repositories/choreRepo'
import {
  DeleteChore as DeleteChoreRemote,
  MarkChoreComplete as MarkChoreCompleteRemote,
  SaveChore as SaveChoreRemote,
  SkipChore as SkipChoreRemote,
} from './Fetcher'

export const completeChore = (id, body, completedDate, performer) =>
  shouldUseLocalFirstStore()
    ? choreRepo
        .complete(id, { completedDate, note: body?.note ?? null })
        .then(localResponse)
    : MarkChoreCompleteRemote(id, body, completedDate, performer)

export const deleteChore = id =>
  shouldUseLocalFirstStore()
    ? choreRepo.remove(id).then(localResponse)
    : DeleteChoreRemote(id)

export const skipChore = id =>
  shouldUseLocalFirstStore()
    ? choreRepo.skip(id).then(localResponse)
    : SkipChoreRemote(id)

export const saveChore = chore =>
  shouldUseLocalFirstStore()
    ? choreRepo.save(chore).then(localResponse)
    : SaveChoreRemote(chore)
