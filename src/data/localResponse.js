/**
 * Response-shaped wrappers for local-mode results.
 *
 * A number of views call the `Fetcher` functions directly and inspect
 * `resp.ok` / `await resp.json()`. Intercepting inside those functions and
 * handing back one of these keeps every one of those call sites working in
 * local mode without a rewrite, which is what makes local-only mode and
 * account mode the same code path from the view's point of view.
 */

/** A successful `{ res: data }` body, the envelope the API uses. */
export const localResponse = (data, { envelope = true } = {}) => ({
  ok: true,
  status: 200,
  json: async () => (envelope ? { res: data } : data),
  text: async () => JSON.stringify(envelope ? { res: data } : data),
})

/** A failure, for operations that genuinely cannot work without an account. */
export const localUnsupported = (
  message = 'Not available without an account',
) => ({
  ok: false,
  status: 501,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message }),
})
