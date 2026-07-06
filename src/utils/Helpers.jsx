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

// Detect cloud storage pre-signed URLs (S3, GCS, Azure) that carry expiry params.
const isCloudSignedUrl = url => {
  if (!url) return false
  try {
    const u = new URL(url)
    return (
      u.searchParams.has('X-Amz-Signature') ||
      u.searchParams.has('X-Amz-Expires') ||
      u.searchParams.has('X-Goog-Signature') ||
      u.searchParams.has('sig') // Azure Blob SAS
    )
  } catch {
    return false
  }
}

// Extract the storage key from a cloud signed URL so we can route it through
// the backend proxy (which re-signs on every request and never expires).
//
// Handles:
//   Virtual-hosted S3:  https://{bucket}.s3[.region].amazonaws.com/{key}?...
//   Path-style S3:      https://s3[.region].amazonaws.com/{bucket}/{key}?...
//   Cloudflare R2:      https://{bucket}.{accountid}.r2.cloudflarestorage.com/{key}?...
//   GCS:                https://storage.googleapis.com/{bucket}/{key}?...
//   Azure Blob:         https://{account}.blob.core.windows.net/{container}/{blob}?...
//
// The app stores files under an "assets/" prefix in the bucket but the backend
// proxy already mounts at /assets/, so we strip that leading segment when present.
const extractStorageKey = url => {
  try {
    const u = new URL(url)
    const host = u.hostname
    const rawPath = u.pathname.replace(/^\//, '')

    let key

    if (host.endsWith('.r2.cloudflarestorage.com')) {
      // Virtual-hosted R2: bucket is in the host, key is the full path
      key = rawPath
    } else if (host.endsWith('.amazonaws.com')) {
      if (host.startsWith('s3') || host.includes('.s3.')) {
        // Path-style S3: first segment is the bucket — strip it
        key = rawPath.split('/').slice(1).join('/')
      } else {
        // Virtual-hosted S3: bucket is in the host, path is the key
        key = rawPath
      }
    } else if (host === 'storage.googleapis.com') {
      // First segment is the bucket
      key = rawPath.split('/').slice(1).join('/')
    } else if (host.endsWith('.blob.core.windows.net')) {
      // First segment is the container name
      key = rawPath.split('/').slice(1).join('/')
    } else {
      key = rawPath
    }

    // The bucket stores files under an "assets/" prefix; the backend /assets/
    // endpoint already adds that prefix, so strip it to avoid duplication.
    if (key.startsWith('assets/')) {
      key = key.slice('assets/'.length)
    }

    return key || null
  } catch {
    return null
  }
}

// Scan an HTML string for <img> tags whose src is a cloud signed URL and
// replace them with backend proxy URLs (which generate fresh signed URLs on
// each request). Returns the patched HTML, or the original if nothing changed.
const refreshSignedUrlsInHtml = html => {
  if (!html) return html
  if (
    !html.includes('X-Amz-') &&
    !html.includes('X-Goog-') &&
    !html.includes('.blob.core.windows.net')
  ) {
    return html
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const imgs = doc.querySelectorAll('img[src]')
  let changed = false

  imgs.forEach(img => {
    const src = img.getAttribute('src')
    if (!isCloudSignedUrl(src)) return

    const key = extractStorageKey(src)
    if (!key) return

    img.setAttribute('src', apiClient.getAssetURL(key))
    changed = true
  })

  return changed ? doc.body.innerHTML : html
}

export { extractStorageKey, isPlusAccount, refreshSignedUrlsInHtml, resolvePhotoURL }
