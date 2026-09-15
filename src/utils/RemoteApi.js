/**
 * Unconditionally remote transport — no `isLocalMode()`/`shouldUseLocalFirstStore()`
 * branching, ever. `Fetcher.jsx`'s label/project functions route to the local
 * repository when the account-local-first flag is on, which is correct for
 * UI writes but wrong for anything that must reach the real server: the
 * account-mode sync engine (`src/sync/accountSync.js`) and the one-time
 * adoption push (`src/sync/adopt.js`) both replay local documents against
 * these calls and would otherwise write back into the local store they just
 * read from (see `docs/offline-first-review.md` finding 1).
 *
 * Keep this module free of mode checks. If a Fetcher function used by sync
 * needs widening to the local store for the UI, add the local branch in
 * `Fetcher.jsx` and have it fall through to the matching function here for
 * the remote case, not the other way around.
 */
import { apiClient } from './ApiClient'

const HEADERS = () => apiClient.getHeaders()

const Fetch = (endpoint, options = {}) => {
  switch (options.method) {
    case 'GET':
      return apiClient.get(endpoint, options)
    case 'POST':
      return apiClient.post(endpoint, options.body, options)
    case 'PUT':
      return apiClient.put(endpoint, options.body, options)
    case 'DELETE':
      return apiClient.delete(endpoint, options)
    default:
      return apiClient.request(endpoint, options)
  }
}

export const CreateLabelRemote = label =>
  Fetch('/labels', {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })

export const UpdateLabelRemote = label =>
  Fetch('/labels', {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })

export const DeleteLabelRemote = id =>
  Fetch(`/labels/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })

export const CreateProjectRemote = project =>
  Fetch('/projects', {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })

export const UpdateProjectRemote = (id, project) =>
  Fetch(`/projects/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })

export const DeleteProjectRemote = id =>
  Fetch(`/projects/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
