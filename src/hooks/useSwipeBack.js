import { useRef } from 'react'

import { isBackSwipe } from '../utils/swipeBack'

// Pointer gestures leave scrolling to the browser via touch-action: pan-y.
export const useSwipeBack = onBack => {
  const gesture = useRef(null)
  const suppressClickUntil = useRef(0)

  return {
    onPointerDown: event => {
      gesture.current = null
      if (
        !onBack ||
        event.pointerType === 'mouse' ||
        !event.isPrimary ||
        event.target.closest(
          'input, textarea, select, [contenteditable="true"], [role="slider"]',
        )
      )
        return
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        direction: getComputedStyle(event.currentTarget).direction,
      }
    },
    onPointerMove: event => {
      const start = gesture.current
      if (!start || start.id !== event.pointerId) return
      const dx = Math.abs(event.clientX - start.x)
      const dy = Math.abs(event.clientY - start.y)
      // Once vertical scrolling wins, never turn it into back navigation.
      if (dy > 10 && dy >= dx) gesture.current = null
    },
    onPointerCancel: () => {
      gesture.current = null
    },
    onPointerUp: event => {
      const start = gesture.current
      gesture.current = null
      if (!start || start.id !== event.pointerId || !onBack) return
      if (
        isBackSwipe({
          dx: event.clientX - start.x,
          dy: event.clientY - start.y,
          elapsed: performance.now() - start.time,
          direction: start.direction,
        })
      ) {
        // A swipe beginning on a menu item must not also activate that item.
        suppressClickUntil.current = performance.now() + 400
        event.preventDefault()
        event.stopPropagation()
        onBack()
      }
    },
    onClickCapture: event => {
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
  }
}
