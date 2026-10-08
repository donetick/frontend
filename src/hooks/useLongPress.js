import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_DELAY_MS = 450
// Deliberately smaller than the swipe list's swipeStartThreshold (10px) so the
// hold is abandoned before a swipe is even recognized.
const MOVE_TOLERANCE_PX = 6

const haptic = async () => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    // no haptics on this platform
  }
}

/**
 * Press-and-hold gesture that works for both touch and mouse.
 *
 * Returns `handlers` to spread on the element and a `cancel` function so the
 * owner can abandon a pending hold when another gesture wins (e.g. the swipe
 * list reports a swipe start). A press that drifts more than
 * MOVE_TOLERANCE_PX, scrolls, or gets cancelled by the browser never fires,
 * and the click that follows a successful hold is swallowed so the element's
 * normal click action doesn't also run.
 */
export const useLongPress = (
  onLongPress,
  { delay = DEFAULT_DELAY_MS, enabled = true } = {},
) => {
  const timerRef = useRef(null)
  const originRef = useRef(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    originRef.current = null
  }, [])

  // Watch movement on the window rather than only on the element: while the
  // swipe list drags the row it translates under the finger, and the pointer
  // can end up over a different element than the one we started on.
  useEffect(() => {
    const handleWindowMove = event => {
      if (!timerRef.current || !originRef.current) return
      const point = event.touches?.[0] ?? event
      if (point.clientX === undefined) return
      const dx = Math.abs(point.clientX - originRef.current.x)
      const dy = Math.abs(point.clientY - originRef.current.y)
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
        clear()
      }
    }

    window.addEventListener('pointermove', handleWindowMove, {
      capture: true,
      passive: true,
    })
    window.addEventListener('touchmove', handleWindowMove, {
      capture: true,
      passive: true,
    })
    window.addEventListener('scroll', clear, { capture: true, passive: true })

    return () => {
      window.removeEventListener('pointermove', handleWindowMove, true)
      window.removeEventListener('touchmove', handleWindowMove, true)
      window.removeEventListener('scroll', clear, true)
      clear()
    }
  }, [clear])

  const start = useCallback(
    event => {
      if (!enabled || !onLongPress) return
      // Ignore right/middle mouse buttons
      if (event.pointerType === 'mouse' && event.button !== 0) return

      clear()
      firedRef.current = false
      originRef.current = { x: event.clientX, y: event.clientY }
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        timerRef.current = null
        haptic()
        onLongPress(event)
      }, delay)
    },
    [enabled, onLongPress, delay, clear],
  )

  const handlers = {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onDragStart: clear,
    // Swallow the click that the browser fires after the finger lifts
    onClickCapture: event => {
      if (firedRef.current) {
        firedRef.current = false
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onContextMenu: event => {
      // A touch long-press otherwise pops the native context menu on top
      if (firedRef.current) {
        event.preventDefault()
      }
    },
  }

  return { handlers, cancel: clear }
}

export default useLongPress
