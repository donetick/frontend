import moment from 'moment'

import { apiClient } from './ApiClient'

const isPlusAccount = userProfile => {
  return userProfile?.expiration && moment(userProfile?.expiration).isAfter()
}

const resolvePhotoURL = url => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('https')) {
    return url
  }
  return apiClient.getAssetURL(url)
}

// Returns the expiry of a signed asset URL in epoch ms, or null when the URL
// carries no expiry (public assets, plain paths, OIDC picture URLs).
// Understands the backend's local signer (`expires` in unix seconds) and
// S3 presigned URLs (`X-Amz-Date` + `X-Amz-Expires`).
const getSignedUrlExpiry = url => {
  if (!url) return null
  try {
    const query = new URL(url, 'http://relative.local').searchParams
    if (query.has('expires')) {
      const expires = parseInt(query.get('expires'), 10)
      return Number.isFinite(expires) ? expires * 1000 : null
    }
    if (query.has('X-Amz-Expires') && query.has('X-Amz-Date')) {
      const iso = query
        .get('X-Amz-Date')
        .replace(
          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
          '$1-$2-$3T$4:$5:$6Z',
        )
      const start = Date.parse(iso)
      const validFor = parseInt(query.get('X-Amz-Expires'), 10)
      if (Number.isFinite(start) && Number.isFinite(validFor)) {
        return start + validFor * 1000
      }
    }
    return null
  } catch {
    return null
  }
}

// One minute of clock skew so we refresh before the server starts rejecting.
const isSignedUrlExpired = url => {
  const expiry = getSignedUrlExpiry(url)
  return expiry != null && Date.now() > expiry - 60_000
}

// Fetches a fresh signed URL for a stored asset path via the authed sign
// endpoint. Memoized per path until the signed URL nears expiry, with
// in-flight de-duplication so a burst of images signs each path once.
const signedUrlCache = new Map()
const getSignedAssetUrl = async path => {
  if (!path) return ''
  const hit = signedUrlCache.get(path)
  if (hit?.url && !isSignedUrlExpired(hit.url)) return hit.url
  if (hit?.promise) return hit.promise

  const promise = (async () => {
    const response = await apiClient.get(
      `/files/sign?path=${encodeURIComponent(path)}`,
    )
    if (!response?.ok) {
      throw new Error(`Failed to sign asset path: ${path}`)
    }
    const data = await response.json()
    const url = resolvePhotoURL(data.url)
    signedUrlCache.set(path, { url })
    return url
  })()
  promise.catch(() => signedUrlCache.delete(path))
  signedUrlCache.set(path, { promise })
  return promise
}

export {
  getSignedAssetUrl,
  getSignedUrlExpiry,
  isPlusAccount,
  isSignedUrlExpired,
  resolvePhotoURL,
}
