import { useEffect, useState } from 'react'
import { patchDescriptionHtml } from '../utils/ImageCache'

// Returns description HTML safe to render: embedded images with an expired
// signed src are swapped for the offline-cached blob or a freshly signed URL.
// Renders the raw HTML immediately and patches in place when needed.
export const useDescriptionHtml = (html, meta = {}) => {
  const [patched, setPatched] = useState(html)

  useEffect(() => {
    let cancelled = false
    setPatched(html)
    if (!html || !html.includes('dt-data-path')) return undefined
    patchDescriptionHtml(html, meta).then(result => {
      if (!cancelled && result !== html) setPatched(result)
    })
    return () => {
      cancelled = true
    }
    // meta is an inline object at call sites; keying on its values would
    // re-run every render, so only the html triggers a re-patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  return patched
}
