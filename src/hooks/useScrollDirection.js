import { useEffect, useRef, useState } from 'react'

const DEFAULT_HIDE_THRESHOLD = 400 // cumulative downward scroll before hiding
const DEFAULT_SHOW_THRESHOLD = 5 // cumulative upward scroll before showing
const DEFAULT_MIN_SCROLL_OFFSET = 64 // never hide until scrolled past this

// Tracks window scroll direction so chrome (nav bars) can hide on a
// deliberate scroll-down and reappear quickly on scroll-up, YouTube-style.
// Small jitters near the top, or brief reversals, don't trigger a hide.
// Returns true while chrome should stay hidden.
export const useScrollDirection = ({
  enabled = true,
  hideThreshold = DEFAULT_HIDE_THRESHOLD,
  minScrollOffset = DEFAULT_MIN_SCROLL_OFFSET,
  showThreshold = DEFAULT_SHOW_THRESHOLD,
} = {}) => {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const accumulated = useRef(0)
  const lastDirection = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    if (!enabled) return undefined

    lastScrollY.current = window.scrollY
    accumulated.current = 0
    lastDirection.current = 0

    const update = () => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current
      const direction = delta > 0 ? 1 : delta < 0 ? -1 : lastDirection.current

      if (currentScrollY <= minScrollOffset) {
        setHidden(false)
        accumulated.current = 0
      } else {
        if (direction !== lastDirection.current) accumulated.current = 0
        accumulated.current += Math.abs(delta)

        if (direction > 0 && accumulated.current > hideThreshold) {
          setHidden(true)
        } else if (direction < 0 && accumulated.current > showThreshold) {
          setHidden(false)
        }
      }

      lastDirection.current = direction
      lastScrollY.current = currentScrollY
      ticking.current = false
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled, hideThreshold, showThreshold, minScrollOffset])

  return enabled && hidden
}
