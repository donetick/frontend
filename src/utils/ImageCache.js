import {
  getSignedAssetUrl,
  isSignedUrlExpired,
  resolvePhotoURL,
} from './Helpers'

// Offline image store keyed by the *stable* storage path (never the signed
// URL, whose query params change on every re-sign). Backed by the Cache
// Storage API, which works in browsers and the Capacitor WebView alike.
//
// Lifecycle: an image stays cached for as long as something still references
// it. syncOfflineImages() reconciles the store against the freshly synced
// chore data — prefetching referenced images that are missing and evicting
// entries whose chore is gone or whose description no longer embeds them.
// Attachment entries are evicted when the attachment (or its chore) is
// deleted. Everything is dropped on logout.

const CACHE_NAME = 'dt-images-v1'
const MANIFEST_KEY = 'dt-image-cache-manifest'

const hasCacheSupport = () =>
  typeof caches !== 'undefined' && typeof window !== 'undefined'

// Cache API keys must be request URLs; keep them under a reserved fake path.
const keyForPath = path => `/__dt-image-cache__/${encodeURI(path)}`

// Manifest maps path -> { choreId, kind: 'description' | 'attachment', cachedAt }.
// It exists so eviction can reason about *why* an image was cached.
const loadManifest = () => {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY)) || {}
  } catch {
    return {}
  }
}
const saveManifest = manifest => {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest))
  } catch {
    // localStorage full or unavailable — cache still works, eviction degrades
  }
}

// Object URLs are memoized per path so repeated renders reuse one blob URL.
const objectUrlByPath = new Map()

const getCachedImageUrl = async path => {
  if (!path || !hasCacheSupport()) return null
  if (objectUrlByPath.has(path)) return objectUrlByPath.get(path)
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(keyForPath(path))
    if (!response) return null
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    objectUrlByPath.set(path, url)
    return url
  } catch {
    return null
  }
}

const isImageCached = async path => {
  if (!path || !hasCacheSupport()) return false
  if (objectUrlByPath.has(path)) return true
  try {
    const cache = await caches.open(CACHE_NAME)
    return !!(await cache.match(keyForPath(path)))
  } catch {
    return false
  }
}

// Downloads fetchUrl and stores it under the stable path. meta records the
// owning chore so eviction can drop the entry when the reference goes away.
const cacheImageFromUrl = async (path, fetchUrl, meta = {}) => {
  if (!path || !fetchUrl || !hasCacheSupport()) return false
  try {
    const response = await fetch(fetchUrl)
    if (!response.ok) return false
    const cache = await caches.open(CACHE_NAME)
    await cache.put(keyForPath(path), response)
    const manifest = loadManifest()
    manifest[path] = { ...manifest[path], ...meta, cachedAt: Date.now() }
    saveManifest(manifest)
    // Invalidate any stale object URL for this path
    const stale = objectUrlByPath.get(path)
    if (stale) {
      URL.revokeObjectURL(stale)
      objectUrlByPath.delete(path)
    }
    return true
  } catch {
    return false
  }
}

const removeCachedImage = async path => {
  if (!path || !hasCacheSupport()) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(keyForPath(path))
  } catch {
    // best effort
  }
  const manifest = loadManifest()
  if (manifest[path]) {
    delete manifest[path]
    saveManifest(manifest)
  }
  const url = objectUrlByPath.get(path)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrlByPath.delete(path)
  }
}

const clearImageCache = async () => {
  if (hasCacheSupport()) {
    try {
      await caches.delete(CACHE_NAME)
    } catch {
      // best effort
    }
  }
  try {
    localStorage.removeItem(MANIFEST_KEY)
  } catch {
    // ignore
  }
  objectUrlByPath.forEach(url => URL.revokeObjectURL(url))
  objectUrlByPath.clear()
}

// Extracts (path, src) pairs for every dt-data-path image embedded in a
// description HTML string. Attribute values are HTML-escaped in the raw
// string ("&amp;"), so src is decoded for fetching while rawSrc keeps the
// exact attribute text for string replacement.
const extractDescriptionImages = html => {
  if (!html || !html.includes('dt-data-path')) return []
  const results = []
  const imgReg = /<img[^>]+>/g
  const pathReg = /dt-data-path="([^"]+)"/
  const srcReg = /src="([^"]*)"/
  const decodeAttr = value => (value ? value.replaceAll('&amp;', '&') : value)
  for (const tag of html.match(imgReg) || []) {
    const path = tag.match(pathReg)?.[1]
    if (!path) continue
    const rawSrc = tag.match(srcReg)?.[1] || null
    results.push({ path: decodeAttr(path), src: decodeAttr(rawSrc), rawSrc })
  }
  return results
}

// Collects every image reference in a chore: description embeds and (when
// present, i.e. detail responses) attachments. path -> { choreId, kind, src }.
const collectChoreImageRefs = (chore, referenced = new Map()) => {
  if (chore?.id == null) return referenced
  for (const { path, src } of extractDescriptionImages(chore.description)) {
    referenced.set(path, {
      choreId: String(chore.id),
      kind: 'description',
      src,
    })
  }
  for (const att of chore.attachments || []) {
    if (att?.file_path) {
      referenced.set(att.file_path, {
        choreId: String(chore.id),
        kind: 'attachment',
        src: att.sign ? resolvePhotoURL(att.sign) : null,
      })
    }
  }
  return referenced
}

// Downloads every referenced image that is not stored yet.
const prefetchReferenced = async referenced => {
  for (const [path, { choreId, kind, src }] of referenced) {
    if (await isImageCached(path)) {
      // keep manifest ownership fresh (chore may have changed via clone etc.)
      const current = loadManifest()
      if (
        current[path] &&
        (current[path].choreId !== choreId || current[path].kind !== kind)
      ) {
        current[path] = { ...current[path], choreId, kind }
        saveManifest(current)
      }
      continue
    }
    let fetchUrl = src && !isSignedUrlExpired(src) ? src : null
    if (!fetchUrl) {
      try {
        fetchUrl = await getSignedAssetUrl(path)
      } catch {
        continue
      }
    }
    await cacheImageFromUrl(path, fetchUrl, { choreId, kind })
  }
}

// Stores one chore's images for offline use without evicting anything.
// Call with detail responses, which are the only place attachments appear.
const cacheChoreImages = async chore => {
  if (!hasCacheSupport()) return
  try {
    await prefetchReferenced(collectChoreImageRefs(chore))
  } catch (err) {
    console.error('Failed to cache chore images', err)
  }
}

// Reconciles the image store with the *complete* synced chore list: every
// image the chores still reference gets downloaded (so offline has
// everything), and cached description images whose chore or reference
// disappeared are evicted. Attachments are only referenced from chore-detail
// responses, so they are evicted here only when their whole chore is gone.
const syncOfflineImages = async chores => {
  if (!hasCacheSupport() || !Array.isArray(chores)) return
  try {
    const referenced = new Map()
    const choreIds = new Set()
    for (const chore of chores) {
      if (chore?.id == null) continue
      choreIds.add(String(chore.id))
      collectChoreImageRefs(chore, referenced)
    }

    // Evict entries that are provably no longer referenced.
    const manifest = loadManifest()
    for (const [path, entry] of Object.entries(manifest)) {
      if (!entry?.choreId) continue
      const choreGone = !choreIds.has(String(entry.choreId))
      const droppedFromDescription =
        entry.kind === 'description' &&
        choreIds.has(String(entry.choreId)) &&
        !referenced.has(path)
      if (choreGone || droppedFromDescription) {
        await removeCachedImage(path)
      }
    }

    await prefetchReferenced(referenced)
  } catch (err) {
    console.error('Offline image sync failed', err)
  }
}

// Returns a displayable src for a stored asset path: the still-valid signed
// src when one is provided, otherwise the cached blob, otherwise a freshly
// signed URL. Opportunistically stores the image for offline use.
const getImageSrc = async (path, signedSrc = null, meta = {}) => {
  if (signedSrc && !isSignedUrlExpired(signedSrc)) {
    if (!(await isImageCached(path))) {
      cacheImageFromUrl(path, signedSrc, meta) // fire and forget
    }
    return signedSrc
  }
  const cached = await getCachedImageUrl(path)
  if (cached) return cached
  const fresh = await getSignedAssetUrl(path)
  cacheImageFromUrl(path, fresh, meta) // fire and forget
  return fresh
}

// Rewrites dt-data-path images in a description HTML string so every img has
// a usable src: valid signed srcs are kept (and stored for offline), expired
// ones are swapped for the cached blob or a freshly signed URL.
const patchDescriptionHtml = async (html, meta = {}) => {
  const images = extractDescriptionImages(html)
  if (images.length === 0) return html
  let patched = html
  for (const { path, rawSrc, src } of images) {
    try {
      const nextSrc = await getImageSrc(path, src, {
        kind: 'description',
        ...meta,
      })
      if (nextSrc && nextSrc !== src) {
        patched = patched.replaceAll(`src="${rawSrc}"`, `src="${nextSrc}"`)
      }
    } catch {
      // offline with no cache entry — leave the original src in place
    }
  }
  return patched
}

export {
  cacheChoreImages,
  cacheImageFromUrl,
  clearImageCache,
  getCachedImageUrl,
  getImageSrc,
  patchDescriptionHtml,
  removeCachedImage,
  syncOfflineImages,
}
