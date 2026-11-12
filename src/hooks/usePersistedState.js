import { useCallback, useState } from 'react'

const read = (key, initial) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? initial : JSON.parse(raw)
  } catch {
    return initial
  }
}

/**
 * useState backed by sessionStorage, so state survives navigating away from a
 * view and back (but not a new tab/session).
 */
export const usePersistedState = (key, initial) => {
  const [value, setValue] = useState(() => read(key, initial))

  const setPersisted = useCallback(
    next => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? next(prev) : next
        try {
          if (
            resolved === initial ||
            resolved === null ||
            resolved === undefined
          ) {
            sessionStorage.removeItem(key)
          } else {
            sessionStorage.setItem(key, JSON.stringify(resolved))
          }
        } catch {
          // storage unavailable — keep in-memory state only
        }
        return resolved
      })
    },
    [key, initial],
  )

  return [value, setPersisted]
}
