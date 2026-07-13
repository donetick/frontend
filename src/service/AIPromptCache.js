const ENABLED_KEY = 'ai_prompt_cache_enabled'
const ENTRY_PREFIX = 'ai_prompt_cache_'
const INDEX_KEY = 'ai_prompt_cache_index'

function djb2(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(36)
}

export function isCacheEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setCacheEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled))
  } catch { /* ignore */ }
}

export function hashContent(content) {
  return djb2(typeof content === 'string' ? content : JSON.stringify(content))
}

function getIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')
  } catch {
    return []
  }
}

export function getCached(hash) {
  if (!isCacheEnabled()) return null
  try {
    const raw = localStorage.getItem(ENTRY_PREFIX + hash)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCached(hash, value) {
  if (!isCacheEnabled()) return
  try {
    localStorage.setItem(ENTRY_PREFIX + hash, JSON.stringify(value))
    const index = getIndex()
    if (!index.includes(hash)) {
      index.push(hash)
      localStorage.setItem(INDEX_KEY, JSON.stringify(index))
    }
  } catch { /* storage full, ignore */ }
}

export function getCacheStats() {
  return { count: getIndex().length }
}

export function clearCache() {
  const index = getIndex()
  index.forEach(h => {
    try { localStorage.removeItem(ENTRY_PREFIX + h) } catch { /* ignore */ }
  })
  try { localStorage.removeItem(INDEX_KEY) } catch { /* ignore */ }
}
